import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  winnerUserId: integer("winner_user_id").references(() => users.id),
  winningNumber: integer("winning_number"),
});

export const roundNumbers = pgTable("round_numbers", {
  roundId: integer("round_id").notNull().references(() => rounds.id),
  number: integer("number").notNull(),
  displayIndex: integer("display_index").notNull(),
});

export const picks = pgTable("picks", {
  id: uuid("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roundId: integer("round_id").notNull().references(() => rounds.id),
  number: integer("number").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertRoundSchema = createInsertSchema(rounds).omit({ id: true });
export const insertPickSchema = createInsertSchema(picks).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Pick = typeof picks.$inferSelect;

// Game specific types
export interface RoundState {
  id: number;
  active: boolean;
  startTime: Date;
  endTime: Date | null;
  displayedNumbers: number[];
  picks: UserPick[];
  winner: string | null;
  winningNumber: number | null;
}

export interface UserPick {
  username: string;
  number: number;
}

export interface Player {
  id: number;
  username: string;
  wins: number;
  roundsPlayed: number;
  connected: boolean;
  participating: boolean;
}

export interface GameState {
  currentRound: RoundState;
  players: Player[];
  roundHistory: RoundState[];
}

export interface RoundNumber {
  roundId: number;
  number: number;
  displayIndex: number;
}

// WebSocket message types
export type ServerMessage = 
  | { type: 'gameState'; data: GameState }
  | { type: 'newRound'; data: RoundState }
  | { type: 'numberRevealed'; data: { roundId: number; number: number; displayIndex: number } }
  | { type: 'roundEnded'; data: RoundState }
  | { type: 'playerJoined'; data: Player }
  | { type: 'playerLeft'; data: { id: number } }
  | { type: 'numberPicked'; data: { roundId: number; pick: UserPick } }
  | { type: 'error'; error: string };

export type ClientMessage =
  | { type: 'join'; username: string }
  | { type: 'pickNumber'; data: { roundId: number; number: number } };
