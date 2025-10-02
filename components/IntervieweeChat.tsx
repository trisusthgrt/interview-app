import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Candidate, InterviewStatus, Message } from '../types';
import { extractInfoFromResume, generateQuestion, summarizeInterview, scoreAnswer } from '../services/geminiService';
import { INTERVIEW_FLOW, TOTAL_QUESTIONS } from '../constants';
import { UploadIcon, AiIcon, UserIcon, SendIcon } from './icons';

interface IntervieweeChatProps {
  activeCandidate: Candidate | null;
  addNewCandidate: (candidate: Candidate) => void;
  updateCandidate: (candidate: Candidate) => void;
}

const Timer: React.FC<{ duration: number, onTimeUp: () => void, isPaused: boolean }> = ({ duration, onTimeUp, isPaused }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isPaused) {
            intervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        onTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPaused, onTimeUp]);
    
    useEffect(() => {
        setTimeLeft(duration);
    },[duration])

    const progress = (timeLeft / duration) * 100;

    return (
        <div className="w-full bg-slate-700 rounded-full h-2.5 my-4">
            <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 1s linear' }}></div>
            <p className="text-center text-xs text-slate-400 mt-1">{timeLeft}s remaining</p>
        </div>
    );
};


const IntervieweeChat: React.FC<IntervieweeChatProps> = ({ activeCandidate, addNewCandidate, updateCandidate }) => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeCandidate?.chatHistory]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setError("Please upload a PDF or DOCX file.");
        return;
    }
    setError('');
    setIsLoading(true);

    const extractedInfo = await extractInfoFromResume(file);
    const newCandidate: Candidate = {
      id: `cand_${Date.now()}`,
      ...extractedInfo,
      status: InterviewStatus.PendingInfo,
      resumeFileName: file.name,
      chatHistory: [{ sender: 'ai', text: `Hello! Thanks for uploading your resume. I've extracted some information. Let's verify it.`, timestamp: Date.now() }],
      answers: [],
      currentQuestionIndex: 0,
      createdAt: Date.now(),
    };
    addNewCandidate(newCandidate);
    setIsLoading(false);
  };
  
  const startInterview = useCallback(async () => {
    if (!activeCandidate) return;
    
    setIsLoading(true);
    
    // Generate the question first, while the user sees the loading spinner.
    const question = await generateQuestion(INTERVIEW_FLOW[0].difficulty, [], activeCandidate.resumeText || '');
    
    // Now that we have the question, update the state all at once.
    const newHistory: Message[] = [
      ...activeCandidate.chatHistory,
      { sender: 'system', text: `Starting Interview. Question 1/${TOTAL_QUESTIONS} (${INTERVIEW_FLOW[0].difficulty})`, timestamp: Date.now() },
      { sender: 'ai', text: question, timestamp: Date.now() }
    ];

    const updatedCandidate: Candidate = {
      ...activeCandidate,
      status: InterviewStatus.InProgress, // Set status here, with the question
      chatHistory: newHistory,
      answers: [...activeCandidate.answers, { question, answer: '', difficulty: INTERVIEW_FLOW[0].difficulty }],
    };
    
    updateCandidate(updatedCandidate);
    setIsLoading(false);
  }, [activeCandidate, updateCandidate]);

  useEffect(() => {
    if (activeCandidate?.status === InterviewStatus.PendingInfo) {
      const missingFields: string[] = [];
      if (!activeCandidate.name) missingFields.push('name');
      if (!activeCandidate.email) missingFields.push('email');
      if (!activeCandidate.phone) missingFields.push('phone');

      if (missingFields.length > 0) {
        const field = missingFields[0];
        const updatedHistory = [...activeCandidate.chatHistory, { sender: 'ai' as const, text: `I couldn't find your ${field}. Could you please provide it?`, timestamp: Date.now() }];
        updateCandidate({ ...activeCandidate, chatHistory: updatedHistory });
      } else {
        const updatedHistory = [...activeCandidate.chatHistory, { sender: 'ai' as const, text: `Great, all your information is complete! Are you ready to start the interview?`, timestamp: Date.now() }];
        updateCandidate({ ...activeCandidate, status: InterviewStatus.Ready, chatHistory: updatedHistory });
      }
    }
  }, [activeCandidate, updateCandidate]);

  const handleUserInput = async () => {
    if (!userInput.trim() || !activeCandidate || isLoading) return;

    const newHistory: Message[] = [...activeCandidate.chatHistory, { sender: 'user', text: userInput, timestamp: Date.now() }];
    const currentInput = userInput;
    setUserInput('');

    let updatedCandidate = { ...activeCandidate, chatHistory: newHistory };
    updateCandidate(updatedCandidate);
    setIsLoading(true);

    if (activeCandidate.status === InterviewStatus.PendingInfo) {
      let infoUpdated = false;
      if (!activeCandidate.name) {
        updatedCandidate.name = currentInput;
        infoUpdated = true;
      } else if (!activeCandidate.email) {
        updatedCandidate.email = currentInput;
        infoUpdated = true;
      } else if (!activeCandidate.phone) {
        updatedCandidate.phone = currentInput;
        infoUpdated = true;
      }
      updateCandidate(updatedCandidate);
    } else if (activeCandidate.status === InterviewStatus.Ready) {
        if (currentInput.toLowerCase().includes('yes')) {
            startInterview();
            return; // startInterview handles its own loading state
        } else {
            const nextMessage: Message = { sender: 'ai', text: "No problem. Just say 'yes' when you are ready to begin.", timestamp: Date.now() };
            updateCandidate({ ...updatedCandidate, chatHistory: [...updatedCandidate.chatHistory, nextMessage] });
        }
    } else if (activeCandidate.status === InterviewStatus.InProgress) {
        await submitAnswerAndContinue(currentInput);
        return; // submitAnswerAndContinue handles its own loading state
    }
    setIsLoading(false);
  };
  
  const submitAnswerAndContinue = useCallback(async (answer: string) => {
    if (!activeCandidate || activeCandidate.status !== InterviewStatus.InProgress) return;

    setIsLoading(true);
    setUserInput('');

    // Step 1: Add user message to chat
    const userMessage: Message = { sender: 'user', text: answer, timestamp: Date.now() };
    const systemMessage: Message = { sender: 'system', text: "Time's up! Moving to the next question.", timestamp: Date.now() };
    const messageToAdd = answer ? userMessage : systemMessage;
    
    const intermediateCandidateState = {
        ...activeCandidate,
        chatHistory: [...activeCandidate.chatHistory, messageToAdd],
    };
    updateCandidate(intermediateCandidateState);

    // Step 2: Score the answer
    const currentQuestion = activeCandidate.answers[activeCandidate.currentQuestionIndex];
    const { score, feedback } = await scoreAnswer(currentQuestion.question, answer, currentQuestion.difficulty);

    const updatedAnswers = [...activeCandidate.answers];
    updatedAnswers[activeCandidate.currentQuestionIndex] = {
        ...currentQuestion,
        answer,
        score,
        feedback,
    };
    
    const nextIndex = activeCandidate.currentQuestionIndex + 1;
    let finalCandidateState: Candidate = {
        ...intermediateCandidateState,
        answers: updatedAnswers,
        currentQuestionIndex: nextIndex,
    };

    if (nextIndex < TOTAL_QUESTIONS) {
        // Step 3a: Get next question
        const questionConfig = INTERVIEW_FLOW[nextIndex];
        const existingQuestions = updatedAnswers.map(a => a.question);
        const newQuestion = await generateQuestion(questionConfig.difficulty, existingQuestions, activeCandidate.resumeText || '');

        finalCandidateState.chatHistory = [
            ...finalCandidateState.chatHistory,
            { sender: 'system', text: `Question ${nextIndex + 1}/${TOTAL_QUESTIONS} (${questionConfig.difficulty})`, timestamp: Date.now() },
            { sender: 'ai', text: newQuestion, timestamp: Date.now() }
        ];
        finalCandidateState.answers.push({ question: newQuestion, answer: '', difficulty: questionConfig.difficulty });
        
        updateCandidate(finalCandidateState);

    } else {
        // Step 3b: Summarize and finish
        finalCandidateState.chatHistory.push({ sender: 'system', text: "Interview completed! Analyzing your results...", timestamp: Date.now() });
        updateCandidate(finalCandidateState); // show "Analyzing..." message

        const { finalScore, finalSummary } = await summarizeInterview(updatedAnswers);
        
        finalCandidateState.status = InterviewStatus.Completed;
        finalCandidateState.finalScore = finalScore;
        finalCandidateState.finalSummary = finalSummary;
        finalCandidateState.chatHistory.push({ sender: 'ai', text: `Thank you for completing the interview!\n\n**Summary:**\n${finalSummary}\n\n**Final Score:** ${finalScore}/100`, timestamp: Date.now() });
        
        updateCandidate(finalCandidateState);
    }
    setIsLoading(false);
  }, [activeCandidate, updateCandidate]);

  if (!activeCandidate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">AI Interview Assistant</h2>
            <p className="text-slate-400 mb-8">Upload your resume to get started. We accept PDF and DOCX files.</p>
            <label htmlFor="resume-upload" className="cursor-pointer group">
                <div className="border-2 border-dashed border-slate-600 group-hover:border-cyan-500 rounded-lg p-10 transition duration-300">
                    <UploadIcon className="w-16 h-16 mx-auto text-slate-500 group-hover:text-cyan-500 transition duration-300" />
                    <p className="mt-4 text-slate-300">
                        {isLoading ? "Analyzing Resume..." : "Click to upload or drag and drop"}
                    </p>
                </div>
            </label>
            <input id="resume-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" disabled={isLoading} />
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    );
  }
  
  const isInterviewActive = activeCandidate.status === InterviewStatus.InProgress;
  const currentQuestionConfig = isInterviewActive ? INTERVIEW_FLOW[activeCandidate.currentQuestionIndex] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-800 rounded-lg overflow-hidden">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {activeCandidate.chatHistory.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0"><AiIcon className="w-5 h-5 text-white" /></div>}
            
            {msg.sender === 'system' ? (
                <div className="w-full text-center text-sm text-slate-400 py-2">{msg.text}</div>
            ) : (
                <div className={`p-4 rounded-lg max-w-lg ${msg.sender === 'ai' ? 'bg-slate-700' : 'bg-blue-600'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
            )}
            
            {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-white" /></div>}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0"><AiIcon className="w-5 h-5 text-white" /></div>
                <div className="p-4 rounded-lg bg-slate-700">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        {isInterviewActive && currentQuestionConfig && (
            <Timer
                key={activeCandidate.currentQuestionIndex}
                duration={currentQuestionConfig.duration}
                onTimeUp={() => submitAnswerAndContinue('')}
                isPaused={isLoading}
            />
        )}
        <div className="flex items-center space-x-4">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleUserInput()}
                placeholder={
                    activeCandidate.status === InterviewStatus.Completed ? "Interview finished." : 
                    isInterviewActive ? "Type your answer here..." : 
                    "Type your message..."
                }
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                disabled={isLoading || activeCandidate.status === InterviewStatus.Completed}
            />
            <button
                onClick={handleUserInput}
                disabled={isLoading || !userInput.trim() || activeCandidate.status === InterviewStatus.Completed}
                className="bg-cyan-500 text-white rounded-lg p-3 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-300"
            >
                <SendIcon className="w-6 h-6"/>
            </button>
        </div>
      </div>
    </div>
  );
};

export default IntervieweeChat;