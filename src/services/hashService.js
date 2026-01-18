// Password hashing service
import bcryptjs from 'bcryptjs';

export const hashPassword = async (password) => {
  return await bcryptjs.hash(password, 10);
}

export const comparePassword = async (password, hash) => {
  return await bcryptjs.compare(password, hash);
};