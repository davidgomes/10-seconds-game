import { storage } from "./storage";
import { type RoundState } from "@shared/schema";

export class GameManager {
  private currentRound: RoundState | null = null;
  private roundTimer: NodeJS.Timeout | null = null;
  private numberRevealTimer: NodeJS.Timeout | null = null;
  private readonly roundDuration = 10000; // 10 seconds
  private readonly numberRevealInterval = 1000; // 1 second

  constructor() {
    this.initGame();
  }

  async initGame() {
    // Start the game with a new round
    await this.startNewRound();
  }

  // Game logic
  private async startNewRound() {
    console.debug("Starting new round", new Date());

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
        winningNumber: null,
      });

      // Initialize the round state
      this.currentRound = {
        id: round.id,
        active: true,
        startTime,
        endTime: null,
        displayedNumbers: [],
        winners: [],
        winningNumber: null,
      };

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

    const revealNumber = async () => {
      if (!this.currentRound || numberIndex >= 10) {
        if (this.numberRevealTimer) {
          clearInterval(this.numberRevealTimer);
          this.numberRevealTimer = null;
        }
        return;
      }

      let number;
      while (true) {
        number = Math.ceil((-Math.log(Math.random()) / 10) * 100);
        if (!this.currentRound.displayedNumbers.includes(number)) {
          await storage.updateRoundNumber(
            this.currentRound.id,
            number,
            numberIndex,
          );
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
    };

    // Reveal numbers one by one
    this.numberRevealTimer = setInterval(
      revealNumber,
      this.numberRevealInterval,
    );

    revealNumber();
  }

  private async endCurrentRound() {
    if (!this.currentRound || !this.currentRound.active) return;

    console.debug("Ending current round", new Date());

    // Mark the round as inactive
    this.currentRound.active = false;
    this.currentRound.endTime = new Date();

    try {
      // Determine the winners from the database
      const picks = await storage.getPicksByRound(this.currentRound.id);
      if (picks.length > 0) {
        // Sort picks by number (descending)
        const sortedPicks = [...picks].sort((a, b) => b.number - a.number);
        const winningNumber = sortedPicks[0].number;
        
        // Find all picks with the winning number
        const winningPicks = sortedPicks.filter(pick => pick.number === winningNumber);
        const winners: string[] = [];

        // Get usernames for all winners
        for (const pick of winningPicks) {
          const user = await storage.getUser(pick.userId);
          if (user) {
            winners.push(user.username);
            // Add winner to round_winners table
            await storage.addRoundWinner(this.currentRound.id, user.id);
          }
        }

        this.currentRound.winners = winners;
        this.currentRound.winningNumber = winningNumber;

        // Update the round in storage
        await storage.updateRound(this.currentRound.id, {
          endTime: this.currentRound.endTime,
          winningNumber: winningNumber,
        });

        // Log the winners for debugging
        console.log(
          `Round ${this.currentRound.id} won by ${winners.join(", ")} with number ${winningNumber}`,
        );
      } else {
        // No picks in this round
        await storage.updateRound(this.currentRound.id, {
          endTime: this.currentRound.endTime,
        });

        console.log(`Round ${this.currentRound.id} ended with no picks`);
      }
    } catch (error) {
      console.error("Error ending round:", error);
    }

    // Start a new round after a short delay (3 seconds)
    setTimeout(() => this.startNewRound(), 3000);
  }
}
