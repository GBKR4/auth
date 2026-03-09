import { configDotenv } from 'dotenv';
configDotenv();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

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
        // Create new user
        const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
        user = await User.create({
          email,
          username,
          password_hash: null, // Google users don't have passwords
          first_name: firstName,
          last_name: lastName,
          google_id: profile.id,
          auth_provider: 'google',
          profile_picture: profilePicture,
          is_verified: true,
          role: 'user'
        });
      }
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Google Strategy Error:', error);
    return done(error, null);
  }
}));

export default passport;