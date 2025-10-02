
import React from 'react';

interface WelcomeBackModalProps {
  candidateName: string;
  onResume: () => void;
  onStartNew: () => void;
}

const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({ candidateName, onResume, onStartNew }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold mb-2 text-cyan-400">Welcome Back, {candidateName}!</h2>
        <p className="text-slate-300 mb-6">You have an interview in progress.</p>
        <div className="flex flex-col space-y-4">
          <button
            onClick={onResume}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
          >
            Resume Interview
          </button>
          <button
            onClick={onStartNew}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
          >
            Start a New Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBackModal;
