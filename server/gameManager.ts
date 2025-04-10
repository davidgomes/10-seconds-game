import { WebSocket } from "ws";
import { storage } from "./storage";
import {
  type User,
  type Round,
  type RoundState,
  type GameState,
  type ServerMessage,
  type ClientMessage,
  type Player,
  type UserPick
} from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

// Connection tracking
interface Connection {
  socket: WebSocket;
  userId?: number;
  username?: string;
  participating: boolean;
}

export class GameManager {
  private connections: Map<WebSocket, Connection> = new Map();
  private currentRound: RoundState | null = null;
  private roundTimer: NodeJS.Timeout | null = null;
  private numberRevealTimer: NodeJS.Timeout | null = null;
  private roundHistoryLimit = 10;
  private readonly roundDuration = 10000; // 10 seconds
  private readonly numberRevealInterval = 1000; // 1 second

  constructor() {
    this.initGame();
  }

  async initGame() {
    // Start the game with a new round
    await this.startNewRound();
  }

  // WebSocket connection handling
  handleConnection(socket: WebSocket) {
    this.connections.set(socket, { socket, participating: false });

    socket.on("message", async (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as ClientMessage;
        await this.handleClientMessage(socket, parsedMessage);
      } catch (error) {
        console.error("Error handling message:", error);
        this.sendToClient(socket, { type: "error", error: "Invalid message format" });
      }
    });

    socket.on("close", () => {
      this.handleDisconnect(socket);
    });

    // Send current game state to the new connection
    this.sendGameState(socket);
  }

  private async handleClientMessage(socket: WebSocket, message: ClientMessage) {
    const connection = this.connections.get(socket);
    if (!connection) return;

    switch (message.type) {
      case "join":
        await this.handleJoin(socket, connection, message.username);
        break;
      case "pickNumber":
        await this.handlePickNumber(socket, connection, message.data);
        break;
    }
  }

  private async handleJoin(socket: WebSocket, connection: Connection, username: string) {
    if (connection.userId) {
      this.sendToClient(socket, { type: "error", error: "Already joined" });
      return;
    }

    try {
      // Check if user exists, otherwise create
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username });
      }

      // Update connection
      connection.userId = user.id;
      connection.username = user.username;

      // All users can participate in any round
      connection.participating = true;

      // Notify all clients about the new player
      const stats = await storage.getPlayerStats(user.id);
      const newPlayer: Player = {
        id: user.id,
        username: user.username,
        wins: stats.wins,
        roundsPlayed: stats.roundsPlayed,
        connected: true,
        participating: connection.participating
      };

      this.broadcastToAll({ type: "playerJoined", data: newPlayer });

      // Send the current game state to the user
      this.sendGameState(socket);
    } catch (error) {
      console.error("Error joining game:", error);
      this.sendToClient(socket, { type: "error", error: "Failed to join game" });
    }
  }

  private async handlePickNumber(
    socket: WebSocket, 
    connection: Connection, 
    data: { roundId: number; number: number }
  ) {
    if (!connection.userId || !connection.username) {
      this.sendToClient(socket, { type: "error", error: "Not joined" });
      return;
    }

    if (!this.currentRound || this.currentRound.id !== data.roundId) {
      this.sendToClient(socket, { type: "error", error: "Invalid round" });
      return;
    }

    if (!this.currentRound.active) {
      this.sendToClient(socket, { type: "error", error: "Round is not active" });
      return;
    }

    if (!connection.participating) {
      this.sendToClient(socket, { type: "error", error: "Not participating in this round" });
      return;
    }

    // Check if number is valid (must be one of the displayed numbers)
    if (!this.currentRound.displayedNumbers.includes(data.number)) {
      this.sendToClient(socket, { type: "error", error: "Invalid number selection" });
      return;
    }

    // Check if user already picked a number in this round
    const existingPick = await storage.getUserPickForRound(connection.userId, this.currentRound.id);
    if (existingPick) {
      this.sendToClient(socket, { type: "error", error: "Already picked a number in this round" });
      return;
    }

    try {
      // Record the pick
      await storage.createPick({
        userId: connection.userId,
        roundId: this.currentRound.id,
        number: data.number,
        timestamp: new Date(),
        writeId: uuidv4()
      });

      // Update the current round state
      const userPick: UserPick = {
        username: connection.username,
        number: data.number
      };
      
      // this.currentRound.picks.push(userPick);

      // Notify all clients about the pick
      this.broadcastToAll({
        type: "numberPicked",
        data: {
          roundId: this.currentRound.id,
          pick: userPick
        }
      });
    } catch (error) {
      console.error("Error picking number:", error);
      this.sendToClient(socket, { type: "error", error: "Failed to pick number" });
    }
  }

  private handleDisconnect(socket: WebSocket) {
    const connection = this.connections.get(socket);
    if (!connection) return;

    if (connection.userId) {
      // Notify all clients about the player leaving
      this.broadcastToAll({
        type: "playerLeft",
        data: { id: connection.userId }
      });
    }

    this.connections.delete(socket);
  }

  // Game logic
  private async startNewRound() {
    try {
      // End previous round if it exists
      if (this.currentRound) {
        await this.endCurrentRound();
      }

      // Clear any existing timers
      if (this.roundTimer) {
        clearTimeout(this.roundTimer);
        this.roundTimer = null;
      }
      
      if (this.numberRevealTimer) {
        clearInterval(this.numberRevealTimer);
        this.numberRevealTimer = null;
      }

      // Create a new round in storage
      const startTime = new Date();
      const round = await storage.createRound({
        startTime,
        endTime: null,
        winnerUserId: null,
        winningNumber: null
      });

      // Initialize the round state
      this.currentRound = {
        id: round.id,
        active: true,
        startTime,
        endTime: null,
        displayedNumbers: [],
        winner: null,
        winningNumber: null
      };

      // Reset participation status for all connections
      Array.from(this.connections.values()).forEach(connection => {
        connection.participating = connection.userId !== undefined;
      });

      // Broadcast new round to all clients
      this.broadcastToAll({ type: "newRound", data: this.currentRound });

      // Start revealing numbers
      this.startRevealingNumbers();

      // Set timer to end the round
      this.roundTimer = setTimeout(() => {
        this.endCurrentRound();
      }, this.roundDuration);
    } catch (error) {
      console.error("Error starting new round:", error);
      // If there's an error, try again in 1 second
      setTimeout(() => this.startNewRound(), 1000);
    }
  }

  private startRevealingNumbers() {
    if (!this.currentRound) return;

    let numberIndex = 0;
    
    // Reveal numbers one by one
    this.numberRevealTimer = setInterval(async () => {
      if (!this.currentRound || numberIndex >= 10) {
        if (this.numberRevealTimer) {
          clearInterval(this.numberRevealTimer);
          this.numberRevealTimer = null;
        }
        return;
      }

      // const number = this.currentRound.numbers[numberIndex];
      
      let number;
      while (true) {
        number = Math.ceil((-Math.log(Math.random()) / 10) * 100);
        if (!this.currentRound.displayedNumbers.includes(number)) {
          await storage.updateRoundNumber(this.currentRound.id, number, numberIndex);
          this.currentRound.displayedNumbers.push(number);
          break;
        }
      }
      
      numberIndex++;
      
      // If all numbers have been revealed, clear the interval
      if (numberIndex >= 10) {
        if (this.numberRevealTimer) {
          clearInterval(this.numberRevealTimer);
          this.numberRevealTimer = null;
        }
      }
    }, this.numberRevealInterval);
  }

  private async endCurrentRound() {
    if (!this.currentRound || !this.currentRound.active) return;

    // Mark the round as inactive
    this.currentRound.active = false;
    this.currentRound.endTime = new Date();

    try {
      // Determine the winner from the database
      const picks = await storage.getPicksByRound(this.currentRound.id);
      if (picks.length > 0) {
        // Sort picks by number (descending)
        const sortedPicks = [...picks].sort((a, b) => b.number - a.number);
        const winningPick = sortedPicks[0];
        
        const user = await storage.getUserByUsername(winningPick.userId.toString());
        
        if (!user) {
          throw new Error("User not found for pick");
        }

        this.currentRound.winner = user.username;
        this.currentRound.winningNumber = winningPick.number;

        // Update the round in storage
        await storage.updateRound(this.currentRound.id, {
          endTime: this.currentRound.endTime,
            winnerUserId: user.id,
            winningNumber: winningPick.number
          });
          
        // Log the winner for debugging
        console.log(`Round ${this.currentRound.id} won by ${user.username} (ID: ${user.id}) with number ${winningPick.number}`);
      } else {
        // No picks in this round
        await storage.updateRound(this.currentRound.id, {
          endTime: this.currentRound.endTime
        });
        
        console.log(`Round ${this.currentRound.id} ended with no picks`);
      }

      // Broadcast round ended to all clients
      this.broadcastToAll({ type: "roundEnded", data: this.currentRound });
    } catch (error) {
      console.error("Error ending round:", error);
    }

    // Start a new round after a short delay (3 seconds)
    setTimeout(() => this.startNewRound(), 3000);
  }

  // Communication methods
  private async sendGameState(socket: WebSocket) {
    try {
      // Gather all necessary data
      const leaderboard = await storage.getLeaderboard();
      const roundHistory = await storage.getRoundHistory(this.roundHistoryLimit);
      
      // Update the connected and participating status in the leaderboard
      const updatedLeaderboard = leaderboard.map(player => {
        // Find if the player is connected
        let connected = false;
        let participating = false;
        
        // Use Array.from to avoid iterator issues
        const connections = Array.from(this.connections.values());
        for (const connection of connections) {
          if (connection.userId === player.id) {
            connected = true;
            participating = connection.participating;
            break;
          }
        }
        
        return { ...player, connected, participating };
      });
      
      // Convert round history to round states
      const roundStates: RoundState[] = await Promise.all(
        roundHistory.map(async round => {
          const picks = await storage.getPicksByRound(round.id);
          
          // Map picks to UserPick format
          const userPicks: UserPick[] = await Promise.all(
            picks.map(async pick => {
              const user = await storage.getUser(pick.userId);
              return {
                username: user?.username || "Unknown",
                number: pick.number
              };
            })
          );
          
          // Determine the winner
          let winner: string | null = null;
          if (round.winnerUserId) {
            const winnerUser = await storage.getUser(round.winnerUserId);
            winner = winnerUser?.username || null;
          }
          
          return {
            id: round.id,
            active: false,
            startTime: round.startTime,
            endTime: round.endTime || new Date(),
            numbers: [], // We don't need to send all numbers for history
            displayedNumbers: [], // We don't need to send displayed numbers for history
            picks: userPicks,
            winner,
            winningNumber: round.winningNumber
          };
        })
      );
      
      // Create the complete game state
      const gameState: GameState = {
        currentRound: this.currentRound || {
          id: 0,
          active: false,
          startTime: new Date(),
          endTime: null,
          displayedNumbers: [],
          picks: [],
          winner: null,
          winningNumber: null
        },
        players: updatedLeaderboard,
        roundHistory: roundStates
      };
      
      console.log("sending gameState", gameState.currentRound);
      
      // Send the game state to the client
      this.sendToClient(socket, { type: "gameState", data: gameState });
    } catch (error) {
      console.error("Error sending game state:", error);
    }
  }

  private sendToClient(socket: WebSocket, message: ServerMessage) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private broadcastToAll(message: ServerMessage) {
    // Convert the map to an array and iterate
    const sockets = Array.from(this.connections).map(([socket]) => socket);
    sockets.forEach(socket => {
      this.sendToClient(socket, message);
    });
  }
}

export const gameManager = new GameManager();
