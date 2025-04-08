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
    <Card className="p-4 text-center">
      <h3 className="text-lg font-bold mb-2">Round Ended</h3>
      
      <div className="mb-4">
        {hasWinner ? (
          <div className="flex justify-center items-center mb-2">
            <Badge className="bg-green-500 text-primary-foreground px-3 py-1">
              <span className="font-bold">Winner:</span>{' '}
              {lastRound.winner} with {lastRound.winningNumber}
            </Badge>
          </div>
        ) : (
          <div className="mb-2">
            <Badge variant="outline" className="px-3 py-1">
              No winners
            </Badge>
          </div>
        )}
        
        <p className="text-sm">
          Next round in <span className="font-bold text-accent-foreground">{nextRoundTimer}</span>
        </p>
      </div>
      
      {lastRound.picks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {lastRound.picks.map((pick, index) => (
            <div 
              key={`${pick.username}-${index}`}
              className={`bg-muted p-2 rounded-md flex items-center justify-between text-sm ${
                pick.username === lastRound.winner ? 'bg-accent/30' : ''
              }`}
            >
              <span className="truncate">{pick.username}</span>
              <span className={`font-bold ${
                pick.username === lastRound.winner ? 'text-accent-foreground' : ''
              }`}>
                {pick.number}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-2 bg-muted rounded-md text-sm">
          No picks were made
        </div>
      )}
    </Card>
  );
}
