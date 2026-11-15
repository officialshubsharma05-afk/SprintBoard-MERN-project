import API from './api';

export const getDashboardStats = async () => {
  const response = await API.get('/dashboard/stats');
  return response.data;
};

export const getTeamMembers = async () => {
  const response = await API.get('/users');
  return response.data;
};
