import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
});

export const connectSocket = (organizationId: string) => {
  if (!socket.connected) {
    socket.connect();
    socket.emit('join_company', organizationId);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
