import React from 'react';
import { useGame } from '@/context/GameContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function GameStatus() {
  const { 
    gameState, 
    isParticipating, 
    timeLeft, 
    isLoading 
  } = useGame();
  
  if (isLoading) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div>
              <Skeleton className="h-7 w-32 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-7 w-16" />
          </div>

          <div className="mt-4 md:mt-0">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (!gameState) return null;

  const roundStatus = gameState.currentRound.active 
    ? "Picking phase" 
    : "Round ended";

  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Timer Background */}
            <div className="w-full h-full rounded-full bg-muted border-2 border-accent flex items-center justify-center">
              <span className="text-2xl font-mono text-accent-foreground">
                {timeLeft}
              </span>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-bold">Round {gameState.currentRound.id}</h2>
            <p className="text-primary text-sm">{roundStatus}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="text-sm text-muted-foreground">Current Number</div>
          <div className="text-2xl font-bold">
            {gameState.currentRound.displayedNumbers.length > 0 
              ? gameState.currentRound.displayedNumbers[0] 
              : '-'}
          </div>
        </div>
      </div>
    </Card>
  );
}
