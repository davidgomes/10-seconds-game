import React from "react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";

interface NumberCardProps {
  number: number;
  disabled?: boolean;
}

export function NumberCard({ number, disabled = false }: NumberCardProps) {
  const { gameState, pickNumber } = useGame();

  const handleClick = () => {
    if (disabled || !gameState) return;
    pickNumber(gameState.currentRound.id, number);
  };

  return (
    <div
      className={cn(
        "w-full max-w-[120px] aspect-square rounded-xl shadow-md flex items-center justify-center transition-all duration-200",
        disabled || !gameState
          ? "bg-gray-100 cursor-not-allowed opacity-70"
          : "bg-gray-50 cursor-pointer hover:bg-[hsl(var(--secondary))] hover:text-white hover:-translate-y-1 hover:shadow-lg",
        "animate-in slide-in-from-bottom duration-300",
      )}
      onClick={handleClick}
    >
      <span className="text-4xl font-bold">{number}</span>
    </div>
  );
}
