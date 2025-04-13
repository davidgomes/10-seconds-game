import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameState } from '@/lib/gameTypes';
import { useToast } from '@/hooks/use-toast';
import { getUsername, setUsername as setUsernameApi, logout as logoutApi } from '@/lib/userApi';
import { useLoading } from './LoadingContext';
import { usePGlite } from '@electric-sql/pglite-react';
import { useShape } from '@electric-sql/react';

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
  hasPicked: boolean;
  userPick: number | null;
  timeLeft: number;
  timeLeftBetweenRounds: number;
  showConfetti: boolean;
}

const initialGameState: GameState = {
  currentRound: {
    id: 0,
    active: false,
    startTime: new Date(),
    endTime: null,
    displayedNumbers: [],
    winner: null,
    winningNumber: null
  },
  players: [],
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userWins, setUserWins] = useState(0);
  const [hasPicked, setHasPicked] = useState(false);
  const [userPick, setUserPick] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [timeLeftBetweenRounds, setTimeLeftBetweenRounds] = useState(BETWEEN_ROUNDS_DURATION_SECONDS);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { toast } = useToast();
  const { setLoading } = useLoading();

  const db = usePGlite()
  
  const { data: users } = useShape<{
    id: number;
    username: string;
  }>({
    url: `https://api.electric-sql.cloud/v1/shape`,
    params: {
      table: `users`,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
      source_secret: import.meta.env.VITE_ELECTRIC_SOURCE_SECRET,
    }
  });
  
  const players = users?.map(user => ({
    id: user.id,
    username: user.username,
    wins: 0,
    roundsPlayed: 0,
    connected: false,
    participating: false
  }));
  
  useEffect(() => {
    if (players) {
      setGameState(prev => ({
        ...prev,
        players
      }));
    }
  }, [users]);

  // Check if user is already logged in from cookie
  useEffect(() => {
    const checkStoredUsername = async () => {
      try {
        const response = await getUsername();
        
        if (response?.username) {
          setUsername(response.username);
          setIsLoggedIn(true);
          setLoading(false);
          
          // Update user stats if available
          if (response.userId) {
            const player = {
              id: response.userId,
              username: response.username,
              wins: response.wins || 0,
              roundsPlayed: response.roundsPlayed || 0,
              connected: true,
              participating: true
            };
            
            setGameState(prev => ({
              ...prev,
              players: [...(prev.players || []), player]
            }));
          }
        } else {
          // If no username is found, ensure we're in a logged out state
          setIsLoggedIn(false);
          setUsername('');
          setLoading(false); // Set loading to false since we're going to Login
        }
      } catch (error) {
        console.error('Error checking stored username:', error);
        // In case of an error, ensure we're in a logged out state
        setIsLoggedIn(false);
        setUsername('');
        setLoading(false); // Set loading to false since we're going to Login
      }
    };
    
    checkStoredUsername();
  }, []);

  // Update user-specific state when gameState changes
  useEffect(() => {
    const updateUserState = async () => {
      if (isLoggedIn && gameState) {
        // Find the user in the players list
        const player = gameState.players.find(p => p.username === username);
        
      if (player) {
        setUserWins(player.wins);
      }
      
      if (!player) {
        throw new Error("Player not found");
      }
      
      // Check if the user has picked in the current round
      const userPick = await db.sql<{
        id: number;
        user_id: number;
        round_id: number;
        number: number;
        timestamp: Date;
      }>`SELECT * FROM picks WHERE user_id = ${player.id} AND round_id = ${gameState.currentRound.id}`;
      if (userPick.rows.length > 1) {
        throw new Error("Multiple picks found for the same user in the same round");
      }

      if (userPick.rows.length > 0) {
        setHasPicked(true);
        setUserPick(userPick.rows[0].number);
      } else {
        setHasPicked(false);
        setUserPick(null);
        }
      }
    };

    updateUserState();
  }, [gameState, isLoggedIn, username]);

  // Timer logic
  useEffect(() => {    
    const updateTimers = () => {
      if (gameState?.currentRound.active) {
        // Active round timer logic
        const startTime = new Date(gameState.currentRound.startTime).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, ROUND_DURATION_SECONDS * 1000 - elapsed);
        // Use decimal for smoother progress
        const newTimeLeft = parseFloat((remaining / 1000).toFixed(1));
        setTimeLeft(newTimeLeft);
      } else if (gameState?.currentRound.endTime) {
        // Between rounds timer logic
        const endTime = new Date(gameState.currentRound.endTime).getTime();
        const now = Date.now();
        const elapsedSinceEnd = now - endTime;
        const remainingBetweenRounds = Math.max(0, BETWEEN_ROUNDS_DURATION_SECONDS * 1000 - elapsedSinceEnd);
        // Use decimal for smoother progress
        const newBetweenRoundsTime = parseFloat((remainingBetweenRounds / 1000).toFixed(1));
        setTimeLeftBetweenRounds(newBetweenRoundsTime);
      }
    };

    const timer = setInterval(updateTimers, 100);
    
    // Update immediately when component mounts or dependencies change
    updateTimers();

    return () => clearInterval(timer);
  }, [gameState]);

  // Login function
  const login = async (newUsername: string) => {
    if (!newUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Username cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Store username in cookie
      await setUsernameApi(newUsername);
      
      setUsername(newUsername);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error setting username cookie:', error);
      toast({
        title: 'Error',
        description: 'Failed to save username',
        variant: 'destructive'
      });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await logoutApi();
      
      setIsLoggedIn(false);
      setUsername('');
      
      // Reset user state
      setUserWins(0);
      setHasPicked(false);
      setUserPick(null);
      
      // Reload page to completely reset state
      window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive'
      });
    }
  };

  // Pick number function
  const pickNumber = async (roundId: number, number: number) => {
    if (!isLoggedIn) {
      toast({
        title: 'Error',
        description: 'You must be logged in to pick a number',
        variant: 'destructive'
      });
      return;
    }
    
    const currentPlayer = gameState?.players.find(p => p.username === username);
    if (!currentPlayer) {
      toast({
        title: 'Error',
        description: 'Could not find your player information',
        variant: 'destructive'
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
      )
    `);
    
    console.log(`picked number ${number} for round ${roundId}`);
    
      setHasPicked(true);
      setUserPick(number);
    } catch (error) {
      // Handle the error from the server
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log("errorMessage", errorMessage);
      if (errorMessage.includes('last available number')) {
        toast({
          title: 'Error',
          description: 'You must pick the last available number',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('already been picked')) {
        toast({
          title: 'Error',
          description: 'This number has already been picked',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to pick number',
          variant: 'destructive'
        });
      }
    }
  };

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
        hasPicked,
        userPick,
        timeLeft,
        timeLeftBetweenRounds,
        showConfetti
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
