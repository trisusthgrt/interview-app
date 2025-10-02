import React, { useState, useMemo } from 'react';
import { Candidate, InterviewStatus } from '../types';
import { SearchIcon, SortAscIcon, SortDescIcon, ChevronLeftIcon } from './icons';

const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
}

const CandidateDetail: React.FC<{ candidate: Candidate; onBack: () => void }> = ({ candidate, onBack }) => {
    return (
        <div className="p-6 bg-slate-800 rounded-lg h-full overflow-y-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6">
                <ChevronLeftIcon className="w-5 h-5" />
                Back to Dashboard
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-slate-700 p-6 rounded-lg self-start">
                    <h2 className="text-2xl font-bold mb-4">{candidate.name}</h2>
                    <p className="text-slate-300">{candidate.email}</p>
                    <p className="text-slate-300">{candidate.phone}</p>
                    <p className="text-xs text-slate-400 mt-2">Resume: {candidate.resumeFileName}</p>
                    <hr className="border-slate-600 my-6" />
                    <h3 className="text-lg font-semibold text-cyan-400">Final Result</h3>
                    {candidate.status === InterviewStatus.Completed ? (
                        <>
                            <p className="text-4xl font-bold my-2">{candidate.finalScore}<span className="text-2xl text-slate-400">/100</span></p>
                            <p className="text-slate-300">{candidate.finalSummary}</p>
                        </>
                    ) : (
                        <p className="text-slate-400">Interview in progress...</p>
                    )}
                </div>
                <div className="md:col-span-2 bg-slate-700 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">Interview Transcript & Analysis</h3>
                    <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                        {candidate.answers.map((answer, index) => (
                            <div key={index} className="p-4 bg-slate-800/50 rounded-lg">
                                <p className="font-semibold text-slate-300 mb-2">Q: {answer.question} <span className="text-xs font-normal text-slate-400">({answer.difficulty})</span></p>
                                {answer.answer ? (
                                    <p className="whitespace-pre-wrap text-slate-200 pl-4 border-l-2 border-blue-500">{answer.answer}</p>
                                ) : (
                                    <p className="text-slate-500 italic pl-4 border-l-2 border-slate-600">No answer provided.</p>
                                )}
                                {answer.score !== undefined && answer.feedback && (
                                     <div className="mt-3 pt-3 border-t border-slate-700">
                                         <p className="text-sm font-semibold">AI Feedback:</p>
                                         <p className={`font-bold text-lg ${getScoreColor(answer.score)}`}>Score: {answer.score}/10</p>
                                         <p className="text-sm text-slate-300 italic">{answer.feedback}</p>
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InterviewerDashboard: React.FC<{ candidates: Candidate[] }> = ({ candidates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'finalScore' | 'createdAt'; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);

  const sortedCandidates = useMemo(() => {
    const sortableItems = [...filteredCandidates];
    sortableItems.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'finalScore') {
          aValue = a.finalScore ?? -1;
          bValue = b.finalScore ?? -1;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [filteredCandidates, sortConfig]);

  const requestSort = (key: 'name' | 'finalScore' | 'createdAt') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: 'name' | 'finalScore' | 'createdAt') => {
      if (sortConfig.key !== key) return null;
      if (sortConfig.direction === 'ascending') return <SortAscIcon className="w-4 h-4" />;
      return <SortDescIcon className="w-4 h-4" />;
  }

  if (selectedCandidate) {
      return <CandidateDetail candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-800 rounded-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-slate-100">Interviewer Dashboard</h1>
      <div className="flex items-center mb-4 bg-slate-900/50 p-2 rounded-lg">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="w-5 h-5 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search candidates..."
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-700">
            <tr>
              <th className="p-4">
                  <button onClick={() => requestSort('name')} className="flex items-center gap-2 hover:text-cyan-400">
                      Candidate {getSortIcon('name')}
                  </button>
              </th>
              <th className="p-4">Status</th>
              <th className="p-4">
                  <button onClick={() => requestSort('finalScore')} className="flex items-center gap-2 hover:text-cyan-400">
                      Score {getSortIcon('finalScore')}
                  </button>
              </th>
              <th className="p-4">
                  <button onClick={() => requestSort('createdAt')} className="flex items-center gap-2 hover:text-cyan-400">
                      Date {getSortIcon('createdAt')}
                  </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sortedCandidates.map(candidate => (
              <tr key={candidate.id} className="hover:bg-slate-700/50 cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                <td className="p-4">
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-sm text-slate-400">{candidate.email}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    candidate.status === InterviewStatus.Completed ? 'bg-green-500/20 text-green-400' :
                    candidate.status === InterviewStatus.InProgress ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-slate-600/50 text-slate-300'
                  }`}>
                    {candidate.status}
                  </span>
                </td>
                <td className="p-4 font-mono">{candidate.finalScore ?? 'N/A'}</td>
                <td className="p-4 text-slate-400">{new Date(candidate.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedCandidates.length === 0 && (
            <div className="text-center py-10 text-slate-500">
                <p>No candidates found.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default InterviewerDashboard;