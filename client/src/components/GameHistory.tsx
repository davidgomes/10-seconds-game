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

  // Use any for the shape type since we're having issues with the Row constraint
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

  // Filter out rounds without any players
  const roundsWithPlayers =
    rounds?.filter((round) => round.winner_user_id !== null) || [];

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Recent Rounds</h3>

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
                  ? `User ${round.winner_user_id} with ${round.winning_number}`
                  : "No winner"}
              </div>

              {/* Since we don't have picks data in the current API response, 
                  we'll need to fetch it separately or modify the API to include it */}
              <div className="mt-3 text-muted-foreground text-sm">
                Pick data not available
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
