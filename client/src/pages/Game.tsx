import React from "react";
import {
  useGame,
  ROUND_DURATION_SECONDS,
  BETWEEN_ROUNDS_DURATION_SECONDS,
} from "@/context/GameContext";
import { GameTabs } from "@/components/GameTabs";
import { ThemePicker } from "@/components/ThemePicker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";

export default function Game() {
  const {
    gameState,
    username,
    userWins,
    pickNumber,
    logout,
    timeLeft,
    timeLeftBetweenRounds,
    showConfetti,
    currentNumber,
    roundStatus,
    didUserWin,
    isRoundOver,
    winningNumber,
    timeLeftProgress,
    timeLeftBetweenRoundsProgress,
    userPick,
  } = useGame();

  if (!gameState) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Confetti overlay when user wins */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
        />
      )}

      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center lg:text-left mb-4 lg:mb-0">
            Pick The Highest Number
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-card text-card-foreground rounded-lg shadow-md px-4 py-2">
              <span className="font-medium">Player: </span>
              <span className="font-bold text-primary">{username}</span>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow-md px-4 py-2">
              <span className="font-medium">Wins: </span>
              <span className="font-bold text-green-500">{userWins}</span>
            </div>
            <div className="ml-2">
              <ThemePicker />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Gameplay Area */}
      <div className="mb-6 relative">
        <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center text-center min-h-[400px] justify-between">
            <div className="w-full flex flex-col items-center justify-center flex-auto py-4">
              {isRoundOver && didUserWin && (
                <div className="mb-6 animate-bounce">
                  <p className="text-2xl font-bold text-green-500 flex items-center justify-center">
                    <Check className="mr-2 h-6 w-6" /> You Won!
                  </p>
                </div>
              )}

              {isRoundOver && !didUserWin && userPick !== null && (
                <div className="mb-6">
                  <p className="text-xl font-medium text-red-500 flex items-center justify-center">
                    <X className="mr-2 h-5 w-5" /> Not this time
                  </p>
                </div>
              )}

              {/* Main game display area */}
              <div className="w-full flex flex-col items-center justify-center py-8">
                {/* Message when round is active and user has picked */}
                {gameState.currentRound.active && Boolean(userPick) && (
                  <p className="mb-4 text-muted-foreground text-sm">
                    Waiting for the round to end...
                  </p>
                )}

                <div
                  className={cn(
                    "flex justify-center items-center h-52",
                    "flex-row space-x-8",
                  )}
                >
                  {isRoundOver && gameState.currentRound.winner === null ? (
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        No Winners
                      </p>
                      <div className="border-2 w-32 h-32 rounded-xl flex flex-col items-center justify-center shadow-lg bg-card border-slate-300">
                        <span className="text-5xl mb-2">😢</span>
                        <span className="text-sm text-center text-muted-foreground px-2">
                          No number was picked
                        </span>
                      </div>
                    </div>
                  ) : currentNumber || isRoundOver ? (
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {isRoundOver ? "Winning Number" : "Current Number"}
                      </p>
                      <div
                        className={cn(
                          "border-2 w-32 h-32 rounded-xl flex items-center justify-center shadow-lg transition-colors",
                          isRoundOver
                            ? "bg-green-50 border-green-500"
                            : !Boolean(userPick)
                              ? "bg-card border-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                              : "bg-card border-muted-foreground/30 opacity-60 cursor-not-allowed",
                        )}
                        onClick={() =>
                          !Boolean(userPick) &&
                          !isRoundOver &&
                          pickNumber(gameState.currentRound.id, currentNumber!)
                        }
                      >
                        <span
                          className={cn(
                            "text-6xl font-bold",
                            isRoundOver
                              ? "text-green-600"
                              : Boolean(userPick) && "text-muted-foreground",
                          )}
                        >
                          {isRoundOver ? winningNumber : currentNumber}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <p className="mb-4">
                        Waiting for the first number to appear...
                      </p>
                      <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      </div>
                    </div>
                  )}

                  {/* User pick section - always rendered beside the current/winning number */}
                  {(Boolean(userPick) || isRoundOver) && userPick !== null && (
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        You Picked
                      </p>
                      <div
                        className={cn(
                          "w-32 h-32 rounded-xl flex items-center justify-center shadow-lg",
                          isRoundOver && didUserWin
                            ? "bg-green-500 text-white"
                            : isRoundOver
                              ? "bg-red-100 border-2 border-red-300 text-red-500"
                              : "bg-primary text-primary-foreground",
                        )}
                      >
                        <span className="text-5xl font-bold">{userPick}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Winner information instead of all picks */}
            {isRoundOver && gameState.currentRound.winner && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <span className="mr-1">🏆</span>
                  <span>
                    Round won by{" "}
                    <span className="font-bold">
                      {gameState.currentRound.winner}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Timer Progress Bar with Round Status */}
            <div className="w-full mt-auto">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    Round {gameState.currentRound.id}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {roundStatus}
                  </span>
                </div>
                <p className="text-sm font-mono font-bold">
                  {isRoundOver
                    ? `${Math.ceil(Math.max(0, Math.min(BETWEEN_ROUNDS_DURATION_SECONDS, timeLeftBetweenRounds)))}s`
                    : `${Math.ceil(Math.max(0, Math.min(ROUND_DURATION_SECONDS, timeLeft)))}s`}
                </p>
              </div>

              <div className="w-full">
                {isRoundOver ? (
                  <Progress
                    value={Math.max(
                      0,
                      Math.min(100, timeLeftBetweenRoundsProgress),
                    )}
                  />
                ) : (
                  <Progress
                    value={Math.max(0, Math.min(100, timeLeftProgress))}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <GameTabs />
    </div>
  );
}
