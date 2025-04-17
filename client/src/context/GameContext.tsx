import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { GameState, Player, RoundState } from "@/lib/gameTypes";
import { useToast } from "@/hooks/use-toast";
import {
  getUsername,
  setUsername as setUsernameApi,
  logout as logoutApi,
} from "@/lib/userApi";
import { useLoading } from "./LoadingContext";
import { usePGlite, useLiveQuery } from "@electric-sql/pglite-react";
import { useShape } from "@electric-sql/react";

// Constants for timing
export const ROUND_DURATION_SECONDS = 10;
export const BETWEEN_ROUNDS_DURATION_SECONDS = 3;

interface GameContextType {
  gameState: GameState | null;
  isLoggedIn: boolean;
  username: string;
  login: (username: string) => void;
  logout: () => void;
  pickNumber: (roundId: number, number: number) => void;
  userWins: number;
  userPick: number | null;
  timeLeft: number;
  timeLeftBetweenRounds: number;
  showConfetti: boolean;
  currentNumber: number | null;
  roundStatus: string;
  didUserWin: boolean;
  isRoundOver: boolean;
  winningNumber: number | null;
  timeLeftProgress: number;
  timeLeftBetweenRoundsProgress: number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [timeLeftBetweenRounds, setTimeLeftBetweenRounds] = useState(
    BETWEEN_ROUNDS_DURATION_SECONDS,
  );

  const { toast } = useToast();
  const { setLoading } = useLoading();
  const db = usePGlite();

  // Get all users with their connection status
  const { data: users } = useShape<{
    id: number;
    username: string;
    connected: boolean;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `users`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  const userRows = users ?? [];

  const { data: roundNumbers } = useShape<{
    displayIndex: number;
    number: number;
    round_id: number;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `round_numbers`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  // Get all rounds to compute stats
  const { data: rounds } = useShape<{
    id: number;
    winner_user_id: number | null;
    start_time: string;
    end_time: string | null;
    winning_number: number | null;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `rounds`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  // Get all picks to compute stats
  const { data: picks } = useShape<{
    user_id: number;
    round_id: number;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `picks`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    },
  });

  // Get current round
  const currentRound = useMemo(
    () =>
      rounds?.sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
      )[0],
    [rounds],
  );

  // Get current round numbers
  const currentRoundNumbers = useMemo(
    () =>
      roundNumbers
        ?.filter((item) => item.round_id === currentRound?.id)
        .sort((a, b) => a.displayIndex - b.displayIndex),
    [roundNumbers, currentRound?.id],
  );

  // Get current player
  const currentPlayer = useMemo(() => {
    console.log("Finding current player for username:", username);
    const player = userRows?.find((user) => user.username === username);
    console.log("Found current player:", player);
    return player;
  }, [userRows, username]);

  // Get user's pick for current round
  const userPickResult = useLiveQuery<{ number: number }>(
    `SELECT number FROM picks WHERE user_id = $1 AND round_id = $2`,
    [currentPlayer?.id ?? null, currentRound?.id ?? null],
  );

  // Compute game state from PGLite data
  const gameState = useMemo<GameState | null>(() => {
    if (!currentRound || !users?.length) return null;

    // Compute stats for each user
    const players: Player[] = users.map((user) => {
      // Count wins
      const wins =
        rounds?.filter((round) => round.winner_user_id === user.id).length ?? 0;

      // Count unique rounds played
      const roundsPlayed = new Set(
        picks
          ?.filter((pick) => pick.user_id === user.id)
          .map((pick) => pick.round_id),
      ).size;

      return {
        id: user.id,
        username: user.username,
        wins,
        roundsPlayed,
        connected: user.connected,
      };
    });

    // Convert UTC database timestamps to local Date objects
    const startTime = new Date(currentRound.start_time + "Z"); // Append Z to treat as UTC
    const endTime = currentRound.end_time
      ? new Date(currentRound.end_time + "Z")
      : null;

    const roundState: RoundState = {
      id: currentRound.id,
      active: currentRound.end_time === null,
      winner: currentRound.winner_user_id
        ? users.find((user) => user.id === currentRound.winner_user_id)
            ?.username || null
        : null,
      winningNumber: currentRound.winning_number,
      startTime,
      endTime,
      displayedNumbers: currentRoundNumbers?.map((item) => item.number) || [],
    };

    return {
      currentRound: roundState,
      players,
    };
  }, [currentRound, currentRoundNumbers, users, rounds, picks]);

  // Update timers
  useEffect(() => {
    if (!gameState?.currentRound) return;

    const updateTimers = () => {
      const now = Date.now();

      if (gameState.currentRound.active) {
        // During active round
        const startTime = gameState.currentRound.startTime.getTime();
        const elapsed = now - startTime;
        const remaining = Math.max(0, ROUND_DURATION_SECONDS * 1000 - elapsed);
        setTimeLeft(remaining / 1000);
      } else if (gameState.currentRound.endTime) {
        // Between rounds
        const endTime = gameState.currentRound.endTime.getTime();
        const elapsedSinceEnd = now - endTime;
        const remainingBetweenRounds = Math.max(
          0,
          BETWEEN_ROUNDS_DURATION_SECONDS * 1000 - elapsedSinceEnd,
        );
        setTimeLeftBetweenRounds(remainingBetweenRounds / 1000);
      }
    };

    const timer = setInterval(updateTimers, 100);
    updateTimers(); // Run immediately to avoid delay

    return () => clearInterval(timer);
  }, [gameState?.currentRound]);

  // Show confetti when user wins
  useEffect(() => {
    if (
      gameState?.currentRound &&
      !gameState.currentRound.active &&
      gameState.currentRound.winner === username
    ) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [gameState?.currentRound, username]);

  // Check if user is already logged in from cookie
  useEffect(() => {
    const checkStoredUsername = async () => {
      try {
        console.log("Checking stored username...");
        const response = await getUsername();
        console.log("getUsername response:", response);

        if (response?.username) {
          console.log("Found stored username:", response.username);
          setUsername(response.username);
          setIsLoggedIn(true);
          setLoading(false);
        } else {
          console.log("No stored username found");
          setIsLoggedIn(false);
          setUsername("");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking stored username:", error);
        setIsLoggedIn(false);
        setUsername("");
        setLoading(false);
      }
    };

    checkStoredUsername();
  }, []);

  // Login function
  const login = async (username: string) => {
    try {
      const response = await fetch("/api/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error("Failed to set username");
      }

      const data = await response.json();
      console.log("Login response:", data);

      // Wait a moment for the user to be created in the database
      // This gives time for the shape subscription to pick up the new user
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setUsername(data.username);
      setIsLoggedIn(true);
      setLoading(false);

      return data;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (currentPlayer) {
        // Call disconnect endpoint before logging out
        await fetch("/api/disconnect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      await logoutApi();
      setIsLoggedIn(false);
      setUsername("");
      window.location.reload();
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  // Pick number function
  const pickNumber = async (roundId: number, number: number) => {
    console.log(`trying to pick number ${number} for round ${roundId}`);

    if (!isLoggedIn || !currentPlayer) {
      toast({
        title: "Error",
        description: "You must be logged in to pick a number",
        variant: "destructive",
      });
      return;
    }

    try {
      await db.query(
        `INSERT INTO picks (
          id,
          user_id,
          round_id,
          number,
          timestamp
        )
        VALUES (
          gen_random_uuid(),
          ${currentPlayer.id},
          ${roundId},
          ${number},
          NOW()
        )`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("last available number")) {
        toast({
          title: "Error",
          description: "You must pick the last available number",
          variant: "destructive",
        });
      } else if (errorMessage.includes("already been picked")) {
        toast({
          title: "Error",
          description: "This number has already been picked",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to pick number",
          variant: "destructive",
        });
      }
    }
  };

  // Compute progress values
  const timeLeftProgress = useMemo(() => {
    if (!gameState?.currentRound?.active) return 0;
    // Original calculation for round progress (starts full, counts down)
    return Math.min(100, (timeLeft / ROUND_DURATION_SECONDS) * 100);
  }, [timeLeft, gameState?.currentRound?.active]);

  const timeLeftBetweenRoundsProgress = useMemo(() => {
    if (gameState?.currentRound?.active) return 0;
    // Inverted calculation for between-rounds progress (starts empty, fills up)
    return Math.min(
      100,
      ((BETWEEN_ROUNDS_DURATION_SECONDS - timeLeftBetweenRounds) /
        BETWEEN_ROUNDS_DURATION_SECONDS) *
        100,
    );
  }, [timeLeftBetweenRounds, gameState?.currentRound?.active]);
  // Compute derived values
  const userWins = useMemo(() => {
    if (!gameState || !username) return 0;
    const player = gameState.players.find((p) => p.username === username);
    return player?.wins ?? 0;
  }, [gameState, username]);

  const userPick = useMemo(() => {
    if (!userPickResult?.rows[0]) return null;
    return userPickResult.rows[0].number;
  }, [userPickResult]);

  const currentNumber = useMemo(() => {
    if (!currentRoundNumbers?.length) return null;
    return currentRoundNumbers[currentRoundNumbers.length - 1].number;
  }, [currentRoundNumbers]);

  const roundStatus = useMemo(() => {
    if (!gameState?.currentRound) return "Waiting for round to start";
    return gameState.currentRound.active ? "Picking phase" : "Round ended";
  }, [gameState?.currentRound]);

  const didUserWin = useMemo(() => {
    if (!gameState?.currentRound || !username) return false;
    return (
      !gameState.currentRound.active &&
      gameState.currentRound.winner === username
    );
  }, [gameState?.currentRound, username]);

  const isRoundOver = useMemo(() => {
    if (!gameState?.currentRound) return false;
    return !gameState.currentRound.active;
  }, [gameState?.currentRound]);

  const winningNumber = useMemo(() => {
    if (!gameState?.currentRound) return null;
    return gameState.currentRound.winningNumber;
  }, [gameState?.currentRound]);

  // Remove the useEffect for updating connected status since it's now in login
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentPlayer) {
        try {
          // Call disconnect endpoint instead of writing to PGLite
          await fetch("/api/disconnect", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Error disconnecting:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentPlayer]);

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoggedIn,
        username,
        login,
        logout,
        pickNumber,
        userWins,
        userPick,
        timeLeft,
        timeLeftBetweenRounds,
        showConfetti,
        currentNumber,
        roundStatus,
        didUserWin,
        isRoundOver,
        winningNumber,
        timeLeftProgress,
        timeLeftBetweenRoundsProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
