import api from './axios.js';

export const register          = (data)             => api.post('/auth/register', data);
export const login             = (data)             => api.post('/auth/login', data);
export const logout            = (refreshToken)     => api.post('/auth/logout', { refreshToken });
export const refresh           = (refreshToken)     => api.post('/auth/refresh', { refreshToken });
export const verifyEmail       = (token)            => api.get(`/auth/verify/${token}`);
export const resendVerification= (email)            => api.post('/auth/resend-verification', { email });
export const forgotPassword    = (email)            => api.post('/auth/forgot-password', { email });
export const resetPassword     = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });
export const validateResetToken= (token)            => api.post('/auth/validate-reset-token', { token });
