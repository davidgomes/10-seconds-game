import React from 'react';
import { useGame } from '@/context/GameContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function Leaderboard() {
  const { gameState, username } = useGame();
  
  if (!gameState) return null;
  
  const players = [...gameState.players].sort((a, b) => b.wins - a.wins);
  
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Current Players</h3>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Wins</TableHead>
              <TableHead>Win Percentage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player, index) => {
              const winPercentage = player.roundsPlayed > 0 
                ? Math.round((player.wins / player.roundsPlayed) * 100) 
                : 0;
                
              const isCurrentUser = player.username === username;
              
              return (
                <TableRow
                  className={isCurrentUser ? 'bg-muted/50' : undefined}
                >
                  <TableCell className="text-center font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {player.username}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {player.wins}
                  </TableCell>
                  <TableCell>
                    {winPercentage}%
                  </TableCell>
                  <TableCell>
                    {player.connected ? (
                      <Badge variant="secondary" className="text-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Disconnected
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {players.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No players have joined yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
