import {
  users,
  rounds,
  picks,
  type User,
  type InsertUser,
  type Round,
  type Pick,
  type Player,
  type RoundState,
  type UserPick,
  insertRoundSchema,
  insertPickSchema
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

// Export these types based on the schemas in shared/schema.ts
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type InsertPick = z.infer<typeof insertPickSchema>;

// Storage interface with all the methods we need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Round methods
  getRound(id: number): Promise<Round | undefined>;
  getCurrentRound(): Promise<Round | undefined>;
  createRound(round: InsertRound): Promise<Round>;
  updateRound(id: number, round: Partial<Round>): Promise<Round | undefined>;
  getRoundHistory(limit: number): Promise<Round[]>;
  
  // Pick methods
  createPick(pick: InsertPick): Promise<Pick>;
  getPicksByRound(roundId: number): Promise<Pick[]>;
  getUserPickForRound(userId: number, roundId: number): Promise<Pick | undefined>;
  
  // Game state methods
  getPlayerStats(userId: number): Promise<{ wins: number; roundsPlayed: number }>;
  getLeaderboard(): Promise<Player[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Round methods
  async getRound(id: number): Promise<Round | undefined> {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }

  async getCurrentRound(): Promise<Round | undefined> {
    // Get all rounds and find the active one
    const allRounds = await db
      .select()
      .from(rounds)
      .orderBy(desc(rounds.id))
      .limit(1);
    
    // Find the most recent round where endTime is null
    return allRounds.find(round => round.endTime === null);
  }

  async createRound(insertRound: InsertRound): Promise<Round> {
    const [round] = await db
      .insert(rounds)
      .values(insertRound)
      .returning();
    
    return round;
  }

  async updateRound(id: number, roundUpdate: Partial<Round>): Promise<Round | undefined> {
    const [updatedRound] = await db
      .update(rounds)
      .set(roundUpdate)
      .where(eq(rounds.id, id))
      .returning();
    
    return updatedRound;
  }

  async getRoundHistory(limit: number): Promise<Round[]> {
    // Get completed rounds (with endTime not null)
    const allRounds = await db
      .select()
      .from(rounds)
      .orderBy(desc(rounds.id))
      .limit(limit);
    
    // Filter out rounds where endTime is null
    return allRounds.filter(round => round.endTime !== null);
  }

  // Pick methods
  async createPick(insertPick: InsertPick): Promise<Pick> {
    const [pick] = await db
      .insert(picks)
      .values(insertPick)
      .returning();
    
    return pick;
  }

  async getPicksByRound(roundId: number): Promise<Pick[]> {
    return await db
      .select()
      .from(picks)
      .where(eq(picks.roundId, roundId));
  }

  async getUserPickForRound(userId: number, roundId: number): Promise<Pick | undefined> {
    const [pick] = await db
      .select()
      .from(picks)
      .where(
        and(
          eq(picks.userId, userId),
          eq(picks.roundId, roundId)
        )
      );
    
    return pick;
  }

  // Game state methods
  async getPlayerStats(userId: number): Promise<{ wins: number; roundsPlayed: number }> {
    // Count rounds played by the user
    const userPicks = await db
      .select()
      .from(picks)
      .where(eq(picks.userId, userId));
    
    // Count rounds won by the user - make sure we only count rounds that have ended
    const userWins = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.winnerUserId, userId),
          // Only count rounds that have a winning number (completed rounds)
          // Using IS NOT NULL in SQL query via Drizzle
          eq(eq(rounds.winningNumber, null), false)
        )
      );
    
    // Count unique rounds to get the actual rounds played
    const uniqueRounds = new Set(userPicks.map(pick => pick.roundId));
    
    return { 
      wins: userWins.length, 
      roundsPlayed: uniqueRounds.size 
    };
  }

  async getLeaderboard(): Promise<Player[]> {
    // Get all users
    const usersList = await this.getAllUsers();
    
    // Get stats for each user and create the leaderboard
    const leaderboard = await Promise.all(
      usersList.map(async (user) => {
        const stats = await this.getPlayerStats(user.id);
        
        return {
          id: user.id,
          username: user.username,
          wins: stats.wins,
          roundsPlayed: stats.roundsPlayed,
          connected: true, // Will be updated by GameManager
          participating: false // Will be updated by GameManager
        };
      })
    );
    
    // Sort by wins descending
    leaderboard.sort((a, b) => b.wins - a.wins);
    
    return leaderboard;
  }
}

export const storage = new DatabaseStorage();
