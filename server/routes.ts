import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { gameManager } from "./gameManager";
import { getThemeFromCookie, setThemeCookie, clearThemeCookie, getUsernameFromCookie, setUsernameCookie, clearUsernameCookie } from "./cookie-utils";
import { v4 as uuidv4 } from 'uuid';
import { type Change, type Transaction } from "@shared/types";
import { type RoundNumber } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (socket: WebSocket) => {
    gameManager.handleConnection(socket);
  });

  // REST API routes
  
  // Get current game state
  app.get('/api/game', async (req, res) => {
    try {
      const currentRound = await storage.getCurrentRound();
      const leaderboard = await storage.getLeaderboard();
      
      res.json({
        currentRound,
        leaderboard
      });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  });
  
  // Get round history
  app.get('/api/rounds', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const rounds = await storage.getRoundHistory(limit);
      
      res.json(rounds);
    } catch (error) {
      console.error('Error fetching round history:', error);
      res.status(500).json({ error: 'Failed to fetch round history' });
    }
  });
  
  // Get picks for a specific round
  app.get('/api/rounds/:id/picks', async (req, res) => {
    try {
      const roundId = parseInt(req.params.id);
      const picks = await storage.getPicksByRound(roundId);
      
      res.json(picks);
    } catch (error) {
      console.error('Error fetching round picks:', error);
      res.status(500).json({ error: 'Failed to fetch round picks' });
    }
  });

  // Get leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Handle changes from the client
  app.post('/changes', async (req, res) => {
    // TODO: check auth
    
    try {
      const transactions: Transaction[] = req.body;
      
      if (!Array.isArray(transactions)) {
        console.warn('Invalid request body. Expected an array of transactions.');
        return res.status(400).json({ error: 'Invalid request body. Expected an array of transactions.' });
      }
      
      // Process each transaction
      for (const transaction of transactions) {
        if (!transaction.id || !Array.isArray(transaction.changes)) {
          console.warn('Invalid transaction format.');
          return res.status(400).json({ error: 'Invalid transaction format.' });
        }
        
        // Process each change in the transaction
        for (const change of transaction.changes) {
          // Only process insert operations for picks
          if (change.operation === 'insert' && change.value) {
            const { id, user_id, round_id, number, timestamp } = change.value;
            
            // Validate required fields
            if (!id || user_id === undefined || round_id === undefined || number === undefined || !timestamp) {
              console.warn('Skipping invalid pick data:', change.value);
              continue;
            }

            // Validate that the user exists
            const user = await storage.getUser(user_id);
            if (!user) {
              console.warn('Invalid user:', user_id);
              return res.status(400).json({ error: 'Invalid user' });
            }

            // Validate that this is the current round
            const currentRound = await storage.getCurrentRound();
            if (!currentRound || currentRound.id !== round_id || currentRound.endTime !== null) {
              return res.status(400).json({ error: 'Invalid round or round is not active' });
            }

            // Get all round numbers to validate the pick
            const roundNumbers = await storage.getRoundNumbers(round_id);
            if (!roundNumbers.some((rn: RoundNumber) => rn.number === number)) {
              return res.status(400).json({ error: 'Invalid number selection' });
            }

            // Check if user already picked in this round
            const existingPick = await storage.getUserPickForRound(user_id, round_id);
            if (existingPick) {
              return res.status(400).json({ error: 'Already picked a number in this round' });
            }
            
            // Create the pick in the database
            await storage.createPick({
              userId: user_id,
              roundId: round_id,
              number,
              timestamp: new Date(timestamp),
              writeId: change.write_id
            }, id);
          }
        }
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error processing changes:', error);
      res.status(500).json({ error: 'Failed to process changes' });
    }
  });

  // Theme API endpoints
  
  // Get current theme preference
  app.get('/api/theme', (req, res) => {
    try {
      const theme = getThemeFromCookie(req);
      res.json({ theme: theme || 'system' });
    } catch (error) {
      console.error('Error fetching theme preference:', error);
      res.status(500).json({ error: 'Failed to fetch theme preference' });
    }
  });
  
  // Set theme preference
  app.post('/api/theme', (req, res) => {
    try {
      const { theme } = req.body;
      
      if (!theme || !['dark', 'vibe', 'system'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme value' });
      }
      
      if (theme === 'system') {
        // Clear the cookie if the theme is 'system'
        clearThemeCookie(res);
      } else {
        // Set the theme cookie
        setThemeCookie(res, theme);
      }
      
      res.json({ theme });
    } catch (error) {
      console.error('Error setting theme preference:', error);
      res.status(500).json({ error: 'Failed to set theme preference' });
    }
  });

  // Username API endpoints
  
  // Get current username
  app.get('/api/username', (req, res) => {
    try {
      const username = getUsernameFromCookie(req);
      res.json({ username: username || null });
    } catch (error) {
      console.error('Error fetching username:', error);
      res.status(500).json({ error: 'Failed to fetch username' });
    }
  });
  
  // Set username
  app.post('/api/username', (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      setUsernameCookie(res, username);
      
      res.json({ username });
    } catch (error) {
      console.error('Error setting username:', error);
      res.status(500).json({ error: 'Failed to set username' });
    }
  });
  
  // Clear username (logout)
  app.post('/api/logout', (req, res) => {
    try {
      clearUsernameCookie(res);
      res.json({ success: true });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  return httpServer;
}
