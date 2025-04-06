import React from 'react';
import { useGame } from '@/context/GameContext';
import { GameStatus } from '@/components/GameStatus';
import { NumberCard } from '@/components/NumberCard';
import { RoundResults } from '@/components/RoundResults';
import { GameTabs } from '@/components/GameTabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function Game() {
  const { 
    gameState, 
    username, 
    userWins, 
    isParticipating, 
    hasPicked, 
    userPick, 
    isLoading 
  } = useGame();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] text-center lg:text-left mb-4 lg:mb-0">
              10 seconds, 10 numbers, 1 pick
            </h1>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>
        
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] text-center lg:text-left mb-4 lg:mb-0">
            10 seconds, 10 numbers, 1 pick
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg shadow-md px-4 py-2">
              <span className="font-medium">Player:</span>
              <span className="font-bold text-[hsl(var(--primary))]">{username}</span>
            </div>
            <div className="bg-white rounded-lg shadow-md px-4 py-2">
              <span className="font-medium">Wins:</span>
              <span className="font-bold text-green-500">{userWins}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Game Status */}
      <GameStatus />
      
      {/* Gameplay Area */}
      <div className="mb-8 relative">
        {gameState.currentRound.active ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Current Round</h3>
            
            {/* User hasn't picked yet */}
            {!hasPicked && isParticipating && (
              <div>
                <p className="text-center mb-6">Select a number! Remember, you can only pick one.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
                  {gameState.currentRound.displayedNumbers.map((number, index) => (
                    <NumberCard key={index} number={number} />
                  ))}
                </div>
              </div>
            )}
            
            {/* User has picked */}
            {hasPicked && isParticipating && (
              <div className="text-center">
                <div className="mb-6">
                  <p className="text-lg mb-2">You picked</p>
                  <div className="inline-block bg-[hsl(var(--secondary))] text-white w-24 h-24 rounded-xl flex items-center justify-center">
                    <span className="text-5xl font-bold">{userPick}</span>
                  </div>
                </div>
                <p>Waiting for the round to end...</p>
                <div className="mt-4 flex justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-[hsl(var(--secondary))] opacity-75 animate-pulse"></div>
                </div>
              </div>
            )}
            
            {/* User is not participating in this round */}
            {!isParticipating && (
              <div className="text-center">
                <p className="text-lg mb-6">You joined after this round started. You'll be able to participate in the next round!</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center opacity-60">
                  {gameState.currentRound.displayedNumbers.map((number, index) => (
                    <NumberCard key={index} number={number} disabled />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <RoundResults />
        )}
      </div>
      
      {/* Tabs */}
      <GameTabs />
    </div>
  );
}
