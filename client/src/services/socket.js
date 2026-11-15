import { io } from 'socket.io-client';

// Determine the server URL based on VITE_API_BASE_URL or current host
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:5000';
  }
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export default socket;
