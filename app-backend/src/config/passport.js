import { configDotenv } from 'dotenv';
configDotenv();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import logger from '../utils/logger.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findByGoogleId(profile.id);
    
    if (!user) {
      // Create new user if doesn't exist
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const firstName = profile.name && profile.name.givenName ? profile.name.givenName : '';
      const lastName = profile.name && profile.name.familyName ? profile.name.familyName : '';
      const profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
      
      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }
      
      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        // Link Google account to existing user
        user = await User.updateById(existingUser.id, {
          google_id: profile.id,
          auth_provider: 'google',
          profile_picture: profilePicture,
          is_verified: true
        });
      } else {
        // Generate a username from the email prefix + random suffix.
        // Retry once with a longer UUID-based suffix if there is a collision.
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
        let username = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;

        const attemptCreate = async (uname) => User.create({
          email,
          username:       uname,
          password_hash:  null,
          first_name:     firstName,
          last_name:       lastName,
          google_id:      profile.id,
          auth_provider:  'google',
          profile_picture: profilePicture,
          is_verified:    true,
          role:           'user',
        });

        try {
          user = await attemptCreate(username);
        } catch (createErr) {
          if (createErr.code === '23505') {
            // Username collision — use a UUID-based suffix that is practically unique
            const { randomUUID } = await import('crypto');
            username = `${baseUsername}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
            user = await attemptCreate(username);
          } else {
            throw createErr;
          }
        }
      }
    }
    
    return done(null, user);
  } catch (error) {
    logger.error('Google OAuth strategy error', { error: error.message });
    return done(error, null);
  }
}));

export default passport;