import { GoogleGenAI, Type } from "@google/genai";
import { Answer, Difficulty } from "../types";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      });
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};

export const extractInfoFromResume = async (file: File) => {
  try {
    const filePart = await fileToGenerativePart(file);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            filePart,
            { text: "Extract the full name, email address, phone number, and the entire text content from this resume. If a field is not found, its value should be an empty string." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            resumeText: { type: Type.STRING, description: "The full text content of the resume." },
          },
        },
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as { name: string; email: string; phone: string; resumeText: string };
  } catch (error) {
    console.error("Error extracting info from resume:", error);
    return { name: "", email: "", phone: "", resumeText: "" };
  }
};

export const generateQuestion = async (difficulty: Difficulty, existingQuestions: string[], resumeText: string): Promise<string> => {
  try {
    const prompt = `You are an expert interviewer for a senior full stack developer role focusing on React and Node.js. 
    The candidate's resume is provided below. Generate one ${difficulty}-level interview question that is highly relevant to the candidate's experience, skills, or projects listed in their resume.
    If the resume is empty, generate a general ${difficulty}-level question for the role.

    Resume Text:
    ---
    ${resumeText || "Not provided."}
    ---
    
    The question should be technical and directly related to their resume if possible. 
    Do not repeat any of the following questions: [${existingQuestions.join(", ")}]. 
    Respond with only the question text, no preamble.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating question:", error);
    return "Error: Could not generate a question. Please try again.";
  }
};

export const scoreAnswer = async (question: string, answer: string, difficulty: Difficulty): Promise<{ score: number; feedback: string }> => {
  try {
    const prompt = `You are an expert technical interviewer. Evaluate the candidate's answer to the following interview question.
    Provide a score from 1 to 10 and a concise feedback (1-2 sentences) on the answer's quality, accuracy, and depth.
    The question's difficulty was ${difficulty}. Consider this when scoring.

    Question:
    ---
    ${question}
    ---

    Candidate's Answer:
    ---
    ${answer || "No answer provided."}
    ---
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "A score from 1 to 10." },
            feedback: { type: Type.STRING, description: "Concise feedback on the answer." },
          },
          required: ["score", "feedback"],
        },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as { score: number; feedback: string };
    result.score = Math.max(1, Math.min(10, result.score));
    return result;
  } catch (error) {
    console.error("Error scoring answer:", error);
    return {
      score: 0,
      feedback: "There was an error scoring this answer.",
    };
  }
};


export const summarizeInterview = async (answers: Answer[]): Promise<{ finalScore: number; finalSummary: string }> => {
  const transcript = answers.map(a => `Q: ${a.question}\nA: ${a.answer || "No answer provided."}\nScore: ${a.score}/10\nFeedback: ${a.feedback}`).join("\n\n");
  
  const totalPossibleScore = answers.length * 10;
  const actualScore = answers.reduce((acc, a) => acc + (a.score || 0), 0);
  const finalScore = totalPossibleScore > 0 ? Math.round((actualScore / totalPossibleScore) * 100) : 0;

  try {
    const prompt = `You are an expert HR manager. Based on the following interview transcript, which includes per-question scores and feedback, provide a 2-3 sentence overall summary of the candidate's performance, strengths, and weaknesses. The final score is already calculated. Do not mention the score in your summary.

    Transcript:\n${transcript}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
        finalScore,
        finalSummary: response.text.trim()
    };
  } catch (error) {
    console.error("Error summarizing interview:", error);
    return {
      finalScore,
      finalSummary: "There was an error generating the interview summary.",
    };
  }
};