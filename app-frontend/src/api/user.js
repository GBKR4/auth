import api from './axios.js';

export const getProfile     = ()     => api.get('/user/profile');
export const updateProfile  = (data) => api.put('/user/profile', data);
export const changePassword = (data) => api.put('/user/change-password', data);
export const deleteAccount  = ()     => api.delete('/user/delete-account');
export const getAllUsers     = ()     => api.get('/user/users');
