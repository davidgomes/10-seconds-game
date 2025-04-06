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

  const participationMessage = isParticipating 
    ? "You're in this round!" 
    : "Joined late - wait for next round";

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Timer Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-500 opacity-20"></div>
            
            {/* Timer Background */}
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-3xl font-mono text-amber-500">
                {timeLeft}
              </span>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-bold">Round {gameState.currentRound.id}</h2>
            <p className="text-blue-500">{roundStatus}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-gray-600 mb-1">Numbers Shown</p>
          <div className="flex items-center">
            <span className="font-bold text-xl">{gameState.currentRound.displayedNumbers.length}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-600">10</span>
          </div>
        </div>

        <div className="mt-4 md:mt-0">
          <Badge 
            variant="outline"
            className={`px-4 py-2 ${isParticipating ? 'bg-green-500' : 'bg-red-500'} text-white`}
          >
            {participationMessage}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
