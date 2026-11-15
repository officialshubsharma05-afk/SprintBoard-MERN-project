import API from './api';

/**
 * Register a new user account
 * @param {Object} userData - { name, email, password, role }
 */
export const register = async (userData) => {
  const response = await API.post('/auth/register', userData);
  return response.data;
};

/**
 * Log in an existing user with credentials
 * @param {Object} credentials - { email, password }
 */
export const login = async (credentials) => {
  const response = await API.post('/auth/login', credentials);
  return response.data;
};

/**
 * Fetch authenticated user profile (requires valid JWT)
 */
export const getProfile = async () => {
  const response = await API.get('/auth/profile');
  return response.data;
};

/**
 * Backward compatibility alias for getProfile
 */
export const getCurrentUser = getProfile;

/**
 * Log out user by removing stored tokens from localStorage
 */
export const logout = () => {
  localStorage.removeItem('sprintboard_token');
  localStorage.removeItem('sprintboard_user');
};
