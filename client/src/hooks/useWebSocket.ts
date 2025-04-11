import { useEffect, useRef, useState, useCallback } from 'react';
import { ServerMessage, ClientMessage } from '@/lib/gameTypes';

interface WebSocketHook {
  lastMessage: ServerMessage | null;
  sendMessage: (message: ClientMessage) => void;
  connected: boolean;
  error: string | null;
}

export function useWebSocket(): WebSocketHook {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setError(null);
    };

    socket.onmessage = (event) => {
      return;
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        setLastMessage(message);
        
        // Handle error messages
        if (message.type === 'error') {
          setError(message.error);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Failed to parse server message');
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
      setConnected(false);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    // Clean up on unmount
    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      setError('WebSocket is not connected');
    }
  }, []);

  return { lastMessage, sendMessage, connected, error };
}
