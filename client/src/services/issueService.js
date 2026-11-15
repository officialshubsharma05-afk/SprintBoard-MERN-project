import API from './api';

/**
 * Fetch issues (supports filtering by projectId, status, priority, search)
 * @param {Object} params - Query parameters
 */
export const getIssues = async (params = {}) => {
  const response = await API.get('/issues', { params });
  return response.data;
};

/**
 * Create a new issue within a project
 * @param {Object} issueData - { title, description, status, priority, projectId }
 */
export const createIssue = async (issueData) => {
  const response = await API.post('/issues', issueData);
  return response.data;
};

/**
 * Update an existing issue
 * @param {string} id - Issue ID
 * @param {Object} issueData - Updated fields
 */
export const updateIssue = async (id, issueData) => {
  const response = await API.put(`/issues/${id}`, issueData);
  return response.data;
};

/**
 * Delete an issue
 * @param {string} id - Issue ID
 */
export const deleteIssue = async (id) => {
  const response = await API.delete(`/issues/${id}`);
  return response.data;
};
