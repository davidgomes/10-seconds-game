import {
  users,
  rounds,
  picks,
  type User,
  type InsertUser,
  type Round,
  type InsertRound,
  type Pick,
  type InsertPick,
  type Player,
  type RoundState,
  type UserPick
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rounds: Map<number, Round>;
  private picks: Map<number, Pick>;
  private userMap: Map<string, number>; // Map username to id for quick lookup
  private currentId: { user: number; round: number; pick: number };

  constructor() {
    this.users = new Map();
    this.rounds = new Map();
    this.picks = new Map();
    this.userMap = new Map();
    this.currentId = { user: 1, round: 1, pick: 1 };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = this.userMap.get(username);
    if (userId) {
      return this.users.get(userId);
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.user++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    this.userMap.set(user.username, id);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Round methods
  async getRound(id: number): Promise<Round | undefined> {
    return this.rounds.get(id);
  }

  async getCurrentRound(): Promise<Round | undefined> {
    // Get the latest round
    if (this.rounds.size === 0) return undefined;
    
    const roundsArray = Array.from(this.rounds.values());
    roundsArray.sort((a, b) => b.id - a.id);
    
    return roundsArray[0];
  }

  async createRound(insertRound: InsertRound): Promise<Round> {
    const id = this.currentId.round++;
    const round: Round = { ...insertRound, id };
    this.rounds.set(id, round);
    return round;
  }

  async updateRound(id: number, roundUpdate: Partial<Round>): Promise<Round | undefined> {
    const round = this.rounds.get(id);
    if (!round) return undefined;
    
    const updatedRound = { ...round, ...roundUpdate };
    this.rounds.set(id, updatedRound);
    
    return updatedRound;
  }

  async getRoundHistory(limit: number): Promise<Round[]> {
    const roundsArray = Array.from(this.rounds.values());
    roundsArray.sort((a, b) => b.id - a.id);
    
    return roundsArray.slice(0, limit);
  }

  // Pick methods
  async createPick(insertPick: InsertPick): Promise<Pick> {
    const id = this.currentId.pick++;
    const pick: Pick = { ...insertPick, id };
    this.picks.set(id, pick);
    return pick;
  }

  async getPicksByRound(roundId: number): Promise<Pick[]> {
    return Array.from(this.picks.values()).filter(pick => pick.roundId === roundId);
  }

  async getUserPickForRound(userId: number, roundId: number): Promise<Pick | undefined> {
    return Array.from(this.picks.values()).find(
      pick => pick.userId === userId && pick.roundId === roundId
    );
  }

  // Game state methods
  async getPlayerStats(userId: number): Promise<{ wins: number; roundsPlayed: number }> {
    const userPicks = Array.from(this.picks.values()).filter(pick => pick.userId === userId);
    const uniqueRounds = new Set(userPicks.map(pick => pick.roundId));
    
    const wins = Array.from(this.rounds.values()).filter(
      round => round.winnerUserId === userId
    ).length;
    
    return {
      wins,
      roundsPlayed: uniqueRounds.size
    };
  }

  async getLeaderboard(): Promise<Player[]> {
    const users = await this.getAllUsers();
    const players: Player[] = [];
    
    for (const user of users) {
      const stats = await this.getPlayerStats(user.id);
      
      players.push({
        id: user.id,
        username: user.username,
        wins: stats.wins,
        roundsPlayed: stats.roundsPlayed,
        connected: true, // This will be updated by the game manager
        participating: false // This will be updated by the game manager
      });
    }
    
    // Sort by wins (descending)
    players.sort((a, b) => b.wins - a.wins);
    
    return players;
  }
}

export const storage = new MemStorage();
