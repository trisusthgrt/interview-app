import React, { useState, useEffect, useCallback } from 'react';
import { Candidate, InterviewStatus, Tab } from './types';
import IntervieweeChat from './components/IntervieweeChat';
import InterviewerDashboard from './components/InterviewerDashboard';
import WelcomeBackModal from './components/WelcomeBackModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('interviewee');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState<Candidate | null>(null);

  useEffect(() => {
    try {
      const storedCandidates = localStorage.getItem('interview_candidates');
      const storedActiveId = localStorage.getItem('interview_active_id');
      if (storedCandidates) {
        const parsedCandidates: Candidate[] = JSON.parse(storedCandidates);
        setCandidates(parsedCandidates);
        
        const activeId = storedActiveId ? JSON.parse(storedActiveId) : null;
        if (activeId) {
            const unfinishedCandidate = parsedCandidates.find(c => c.id === activeId && c.status !== InterviewStatus.Completed);
            if (unfinishedCandidate) {
                setShowWelcomeBack(unfinishedCandidate);
            } else {
                localStorage.removeItem('interview_active_id');
            }
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('interview_candidates', JSON.stringify(candidates));
      if (activeCandidateId) {
        localStorage.setItem('interview_active_id', JSON.stringify(activeCandidateId));
      } else {
        localStorage.removeItem('interview_active_id');
      }
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }, [candidates, activeCandidateId]);

  const addNewCandidate = useCallback((candidate: Candidate) => {
    setCandidates(prev => [...prev, candidate]);
    setActiveCandidateId(candidate.id);
  }, []);
  
  const updateCandidate = useCallback((updatedCandidate: Candidate) => {
    setCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
  }, []);

  const handleResume = () => {
    if (showWelcomeBack) {
      setActiveCandidateId(showWelcomeBack.id);
      setShowWelcomeBack(null);
    }
  };

  const handleStartNew = () => {
    setActiveCandidateId(null);
    setShowWelcomeBack(null);
    localStorage.removeItem('interview_active_id');
  };

  const activeCandidate = candidates.find(c => c.id === activeCandidateId) || null;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Crisp AI Interview Assistant
        </h1>
        <nav className="flex justify-center mt-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('interviewee')}
            className={`px-6 py-3 font-semibold transition-colors duration-300 ${activeTab === 'interviewee' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          >
            Interviewee
          </button>
          <button
            onClick={() => setActiveTab('interviewer')}
            className={`px-6 py-3 font-semibold transition-colors duration-300 ${activeTab === 'interviewer' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          >
            Interviewer
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col h-[calc(100vh-150px)]">
        {activeTab === 'interviewee' ? (
          <IntervieweeChat 
            activeCandidate={activeCandidate}
            addNewCandidate={addNewCandidate}
            updateCandidate={updateCandidate}
          />
        ) : (
          <InterviewerDashboard candidates={candidates} />
        )}
      </main>

      {showWelcomeBack && (
        <WelcomeBackModal 
          candidateName={showWelcomeBack.name || 'Candidate'}
          onResume={handleResume}
          onStartNew={handleStartNew}
        />
      )}
    </div>
  );
};

export default App;