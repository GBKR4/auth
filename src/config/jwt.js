// JWT configuration

export const accessTokenSecret = () => {
  return process.env.JWT_ACCESS_SECRET
}

export const refreshTokenSecret = () => {
  return process.env.JWT_REFRESH_SECRET
}

export const accessTokenExpiry = () => {
  return process.env.ACCESS_TOKEN_EXPIRY || '15m';
}

export const refreshTokenExpiry = () => {
  return process.env.REFRESH_TOKEN_EXPIRY || '7d';
}