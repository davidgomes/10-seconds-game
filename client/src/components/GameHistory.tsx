import React from 'react';
import { useGame } from '@/context/GameContext';

export function GameHistory() {
  const { gameState } = useGame();
  
  if (!gameState) return null;
  
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    
    const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)} minutes ago`;
    } else if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)} hours ago`;
    } else {
      return d.toLocaleDateString();
    }
  };
  
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Recent Rounds</h3>
      
      <div className="space-y-4">
        {gameState.roundHistory.map(round => (
          <div key={round.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
              <span className="font-medium">Round {round.id}</span>
              <span className="text-sm text-gray-500">
                {formatDate(round.endTime || round.startTime)}
              </span>
            </div>
            <div className="p-4">
              <div className="mb-2">
                <span className="font-medium text-[hsl(var(--primary))]">Winner:</span>{' '}
                {round.winner 
                  ? `${round.winner} with ${round.winningNumber}` 
                  : 'No winner'
                }
              </div>
              
              {round.picks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                  {round.picks.map((pick, index) => (
                    <div 
                      key={`${pick.username}-${index}`}
                      className={`bg-gray-50 p-2 rounded-md flex justify-between ${
                        pick.username === round.winner ? 'bg-green-50' : ''
                      }`}
                    >
                      <span className="text-sm">{pick.username}</span>
                      <span className={`font-medium ${pick.username === round.winner ? 'text-green-500' : ''}`}>
                        {pick.number}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-gray-500 text-sm">
                  No picks were made in this round
                </div>
              )}
            </div>
          </div>
        ))}
        
        {gameState.roundHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No round history available yet
          </div>
        )}
      </div>
    </div>
  );
}
