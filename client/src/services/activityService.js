import API from './api';

/**
 * Fetch activity logs (optionally filtered by projectId)
 * @param {Object} params - Query params e.g. { projectId: '...' }
 */
export const getActivities = async (params = {}) => {
  const response = await API.get('/activities', { params });
  return response.data;
};
