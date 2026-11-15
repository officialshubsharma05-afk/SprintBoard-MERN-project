import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sprintboard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expirations or global errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (localStorage.getItem('sprintboard_token')) {
        localStorage.removeItem('sprintboard_token');
        localStorage.removeItem('sprintboard_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
