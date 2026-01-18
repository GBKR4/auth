// Auth business logic service
import { findById, findByEmail, findByUsername, create, updateById, markAsVerified, updateLastLogin, deleteById} from "../models/User.js";
import {createRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllUserTokens, createVerificationToken, findVerificationToken, markTokenAsUsed, deleteExpiredTokens} from   "../models/Token.js";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateVerificationToken, generatePasswordResetToken, hashToken } from "./tokenService.js";
import { hashPassword, comparePassword} from "./hashService.js";
import {  sendEmail, sendPasswordResetEmail, sendVerificationEmail,sendWelcomeEmail } from "./emailService.js";

export const registerUser = async (userData) => {
  const { email, username, password, first_name, last_name } = userData;

  const result = await findByEmail(email);
  if (result) {
    throw new Error('Email already registered');
  }

  const existingUsername = await findByUsername(username);
  if (existingUsername) {
    throw new Error('Username already taken');  
  }

  const passwordHash = await hashPassword(password);
  const newUser = await create({
    email,
    username,
    passwordHash,
    first_name,
    last_name,
  });

  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await createVerificationToken(newUser.id, verificationToken, 'email_verification', expiresAt);
  await sendVerificationEmail(newUser.email, verificationToken);
  return verificationToken;
};

export const loginUser = async (email, password) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  await updateLastLogin(user.id);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);
  return { accessToken, refreshToken };
};

export const verifyEmail = async (token) => {
  const storedToken = await findVerificationToken(token, 'email_verification');
  if (!storedToken) {
    throw new Error('Invalid or expired verification token');
  }

  await markAsVerified(storedToken.user_id);
  await markTokenAsUsed(token);
  await sendWelcomeEmail(storedToken.user_id);
  return true;
};

export const initiatePasswordReset = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new Error('Email not found');  
  }
  const resetToken = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
  await createVerificationToken(user.id, resetToken, 'password_reset', expiresAt);
  await sendPasswordResetEmail(user.email, resetToken);
  return resetToken;
};

export const completePasswordReset = async (token, newPassword) => {
  const storedToken = await findVerificationToken(token, 'password_reset');
  if (!storedToken) {
    throw new Error('Invalid or expired password reset token');
  }
  const newHashedPassword = await hashPassword(newPassword);
  await updateById(storedToken.user_id, { password_hash: newHashedPassword });
  await markTokenAsUsed(token);
  return true; 
}