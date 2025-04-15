import React from "react";
import { useGame } from "../context/GameContext";
import { Player } from "../../../shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function Leaderboard() {
  const { gameState } = useGame();

  if (!gameState) {
    return null;
  }

  const { players } = gameState;

  // Sort players by wins (descending), then win percentage (descending), then connection status
  const sortedPlayers = [...players].sort((a, b) => {
    // First sort by wins
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    // If wins are equal, sort by win percentage
    const aWinPercentage = a.roundsPlayed > 0 ? a.wins / a.roundsPlayed : 0;
    const bWinPercentage = b.roundsPlayed > 0 ? b.wins / b.roundsPlayed : 0;
    if (aWinPercentage !== bWinPercentage) {
      return bWinPercentage - aWinPercentage;
    }
    // If win percentage is equal, sort by connection status (connected players first)
    return b.connected ? 1 : a.connected ? -1 : 0;
  });

  return (
    <div className="w-full">
      <div className="rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Wins</TableHead>
              <TableHead>Rounds Played</TableHead>
              <TableHead>Win %</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.map((player: Player, index: number) => (
              <TableRow key={player.username}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{player.username}</TableCell>
                <TableCell>{player.wins}</TableCell>
                <TableCell>{player.roundsPlayed}</TableCell>
                <TableCell>
                  {player.roundsPlayed > 0
                    ? `${((player.wins / player.roundsPlayed) * 100).toFixed(1)}%`
                    : "0%"}
                </TableCell>
                <TableCell>
                  <Badge variant={player.connected ? "default" : "secondary"}>
                    {player.connected ? "Connected" : "Offline"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
