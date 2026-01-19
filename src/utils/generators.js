// Token/code generators
import crypto from 'crypto';

export const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

export const generateUserName = ( email ) => {
  const namePart = email.split('@')[0];
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${namePart}_${randomSuffix}`;
};