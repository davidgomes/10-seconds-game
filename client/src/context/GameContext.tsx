import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameState, RoundState, Player, ServerMessage, UserPick } from '@/lib/gameTypes';
import { useToast } from '@/hooks/use-toast';

interface GameContextType {
  gameState: GameState | null;
  isLoggedIn: boolean;
  username: string;
  login: (username: string) => void;
  pickNumber: (roundId: number, number: number) => void;
  userWins: number;
  isParticipating: boolean;
  hasPicked: boolean;
  userPick: number | null;
  timeLeft: number;
  isLoading: boolean;
}

const initialGameState: GameState = {
  currentRound: {
    id: 0,
    active: false,
    startTime: new Date(),
    endTime: null,
    numbers: [],
    displayedNumbers: [],
    picks: [],
    winner: null,
    winningNumber: null
  },
  players: [],
  roundHistory: []
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userWins, setUserWins] = useState(0);
  const [isParticipating, setIsParticipating] = useState(false);
  const [hasPicked, setHasPicked] = useState(false);
  const [userPick, setUserPick] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  
  const { lastMessage, sendMessage, connected, error } = useWebSocket();
  const { toast } = useToast();
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'gameState':
        setGameState(lastMessage.data);
        setIsLoading(false);
        break;
      case 'newRound':
        setGameState(prev => ({
          ...prev,
          currentRound: lastMessage.data
        }));
        
        // Reset round-specific state
        setHasPicked(false);
        setUserPick(null);
        setTimeLeft(10);
        break;
      case 'numberRevealed':
        if (lastMessage.data.roundId === gameState.currentRound.id) {
          setGameState(prev => {
            if (!prev) return prev;
            
            // Only keep the latest number instead of the entire array
            return {
              ...prev,
              currentRound: {
                ...prev.currentRound,
                displayedNumbers: [lastMessage.data.number]
              }
            };
          });
        }
        break;
      case 'roundEnded':
        setGameState(prev => {
          if (!prev) return prev;
          
          // Add the ended round to history
          const updatedHistory = [lastMessage.data, ...prev.roundHistory].slice(0, 10);
          
          // Check if the current user won this round
          if (lastMessage.data.winner === username) {
            // Increment the user's win count
            setUserWins(prevWins => prevWins + 1);
            
            // Notify the user that they won
            toast({
              title: '🎉 You Won!',
              description: `You picked the highest number: ${lastMessage.data.winningNumber}`,
              duration: 5000
            });
          }
          
          return {
            ...prev,
            currentRound: lastMessage.data,
            roundHistory: updatedHistory
          };
        });
        break;
      case 'playerJoined':
      case 'playerLeft':
        // Update players list when a player joins or leaves
        setGameState(prev => {
          if (!prev) return prev;
          
          let updatedPlayers: Player[];
          
          if (lastMessage.type === 'playerJoined') {
            // Add or update the player
            const existingPlayerIndex = prev.players.findIndex(p => p.id === lastMessage.data.id);
            
            if (existingPlayerIndex >= 0) {
              updatedPlayers = [...prev.players];
              updatedPlayers[existingPlayerIndex] = lastMessage.data;
            } else {
              updatedPlayers = [...prev.players, lastMessage.data];
            }
          } else {
            // Remove the player or mark as disconnected
            updatedPlayers = prev.players.map(player => 
              player.id === lastMessage.data.id 
                ? { ...player, connected: false } 
                : player
            );
          }
          
          return {
            ...prev,
            players: updatedPlayers
          };
        });
        break;
      case 'numberPicked':
        if (lastMessage.data.roundId === gameState.currentRound.id) {
          // Update the picks for the current round
          setGameState(prev => {
            if (!prev) return prev;
            
            const updatedPicks = [...prev.currentRound.picks, lastMessage.data.pick];
            
            return {
              ...prev,
              currentRound: {
                ...prev.currentRound,
                picks: updatedPicks
              }
            };
          });
          
          // If this is the user's pick, update the user's state
          if (lastMessage.data.pick.username === username) {
            setHasPicked(true);
            setUserPick(lastMessage.data.pick.number);
          }
        }
        break;
    }
  }, [lastMessage, gameState.currentRound.id, username, toast]);

  // Update user-specific state when gameState changes
  useEffect(() => {
    if (isLoggedIn && gameState) {
      // Find the user in the players list
      const player = gameState.players.find(p => p.username === username);
      
      if (player) {
        setUserWins(player.wins);
        setIsParticipating(player.participating);
      }
      
      // Check if the user has picked in the current round
      const userPickObj = gameState.currentRound.picks.find(pick => pick.username === username);
      if (userPickObj) {
        setHasPicked(true);
        setUserPick(userPickObj.number);
      } else {
        setHasPicked(false);
        setUserPick(null);
      }
    }
  }, [gameState, isLoggedIn, username]);

  // Timer logic
  useEffect(() => {
    if (!gameState?.currentRound.active) {
      return;
    }

    // Calculate time left
    const startTime = new Date(gameState.currentRound.startTime).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, 10000 - elapsed);
    setTimeLeft(Math.ceil(remaining / 1000));

    // Set up the timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newValue = Math.max(0, prev - 1);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.currentRound.active, gameState?.currentRound.startTime]);

  // Login function
  const login = (newUsername: string) => {
    if (!newUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Username cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    setUsername(newUsername);
    setIsLoggedIn(true);
    
    // Send join message to the server
    sendMessage({ type: 'join', username: newUsername });
  };

  // Pick number function
  const pickNumber = (roundId: number, number: number) => {
    if (!isLoggedIn) {
      toast({
        title: 'Error',
        description: 'You must be logged in to pick a number',
        variant: 'destructive'
      });
      return;
    }

    if (hasPicked) {
      toast({
        title: 'Error',
        description: 'You have already picked a number for this round',
        variant: 'destructive'
      });
      return;
    }

    // All users can participate now
    sendMessage({
      type: 'pickNumber',
      data: { roundId, number }
    });
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoggedIn,
        username,
        login,
        pickNumber,
        userWins,
        isParticipating,
        hasPicked,
        userPick,
        timeLeft,
        isLoading
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
