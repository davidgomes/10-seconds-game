import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RoundResults() {
  const { gameState } = useGame();
  const [nextRoundTimer, setNextRoundTimer] = useState(3);
  
  useEffect(() => {
    if (!gameState || gameState.currentRound.active) {
      return;
    }
    
    // Reset timer when a round ends
    setNextRoundTimer(3);
    
    const timer = setInterval(() => {
      setNextRoundTimer(prev => {
        const newValue = Math.max(0, prev - 1);
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState?.currentRound.active]);
  
  if (!gameState || gameState.roundHistory.length === 0) {
    return null;
  }
  
  const lastRound = gameState.roundHistory[0];
  const hasWinner = lastRound.winner !== null;
  
  return (
    <Card className="p-6 text-center">
      <h3 className="text-xl font-bold mb-4">Round {lastRound.id} Results</h3>
      
      <div className="mb-6">
        {hasWinner ? (
          <div className="flex justify-center items-center mb-4">
            <Badge className="bg-[hsl(var(--primary))] text-white px-4 py-2 text-base">
              <span className="font-bold">Winner:</span>{' '}
              {lastRound.winner} with {lastRound.winningNumber}
            </Badge>
          </div>
        ) : (
          <div className="mb-4">
            <Badge variant="outline" className="px-4 py-2 text-base">
              No winners in this round
            </Badge>
          </div>
        )}
        
        <p>
          Next round starts in <span className="font-bold text-amber-500">{nextRoundTimer}</span> seconds
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lastRound.picks.map((pick, index) => (
          <div 
            key={`${pick.username}-${index}`}
            className={`bg-gray-50 p-3 rounded-lg shadow flex items-center justify-between ${
              pick.username === lastRound.winner ? 'bg-green-50' : ''
            }`}
          >
            <span className="font-medium">{pick.username}</span>
            <span className={`font-bold text-2xl ${
              pick.username === lastRound.winner ? 'text-green-500' : ''
            }`}>
              {pick.number}
            </span>
          </div>
        ))}
        
        {lastRound.picks.length === 0 && (
          <div className="col-span-full text-center p-4 bg-gray-50 rounded-lg">
            No picks were made in this round
          </div>
        )}
      </div>
    </Card>
  );
}
