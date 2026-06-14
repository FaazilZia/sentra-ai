import { io, Socket } from 'socket.io-client';

export const getBaseSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'https://sentra-backend-node.onrender.com/api/v1';
  let trimmed = envUrl.trim().replace(/\/$/, '');
  
  if (trimmed.endsWith('/api/v1')) {
    trimmed = trimmed.replace('/api/v1', '');
  } else if (trimmed.endsWith('/api')) {
    trimmed = trimmed.replace('/api', '');
  }
  
  return trimmed || 'https://sentra-backend-node.onrender.com';
};

export const socket: Socket = io(getBaseSocketUrl(), {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  autoConnect: false, // Connect manually when authenticated
});

export const setSocketAuthToken = (token: string | null) => {
  socket.auth = token ? { token } : {};
};
