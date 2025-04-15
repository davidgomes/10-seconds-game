import React from "react";
import { useGame } from "@/context/GameContext";
import { useShape } from "@electric-sql/react";

// Define types for our data
interface Round {
  id: number;
  start_time: string;
  winner_user_id: number | null;
  winning_number: number | null;
  end_time: string | null;
}

interface Pick {
  username: string;
  number: number;
}

export function GameHistory() {
  const { gameState } = useGame();

  if (!gameState) return null;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    
    // Check if it's today
    if (d.toDateString() === now.toDateString()) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For older dates, show the date and time
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Fetch rounds data
  const { data: rounds } = useShape<{
    id: number;
    start_time: string;
    winner_user_id: number | null;
    winning_number: number | null;
    end_time: string | null;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `rounds`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  // Fetch users data
  const { data: users } = useShape<{
    id: number;
    username: string;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `users`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  // Create a map of user IDs to usernames
  const userMap = new Map(users?.map(user => [user.id, user.username]) || []);

  // Filter out rounds without any players and sort by start time (most recent first)
  const roundsWithPlayers = rounds
    ?.filter((round) => round.winner_user_id !== null)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) || [];

  return (
    <div className="p-6">
      <div className="space-y-4">
        {roundsWithPlayers.map((round) => (
          <div
            key={round.id}
            className="border border-border rounded-lg overflow-hidden"
          >
            <div className="bg-muted px-4 py-2 flex justify-between items-center">
              <span className="font-medium">Round {round.id}</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(round.end_time || round.start_time)}
              </span>
            </div>
            <div className="p-4">
              <div className="mb-2">
                <span className="font-medium text-primary">Winner:</span>{" "}
                {round.winner_user_id
                  ? `${userMap.get(round.winner_user_id) || `User ${round.winner_user_id}`} with ${round.winning_number}`
                  : "No winner"}
              </div>
            </div>
          </div>
        ))}

        {roundsWithPlayers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No round history available yet
          </div>
        )}
      </div>
    </div>
  );
}
