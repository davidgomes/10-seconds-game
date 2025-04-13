import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaderboard } from "@/components/Leaderboard";
import { GameHistory } from "@/components/GameHistory";

export function GameTabs() {
  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="history">Game History</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>

        <TabsContent value="history">
          <GameHistory />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
