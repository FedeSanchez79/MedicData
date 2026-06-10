import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { openDb } from '../database.js';

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

async function generarUsernameUnico(db, base) {
  let username = base.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 20) || 'usuario';
  let candidato = username;
  let intento = 0;

  while (await db.get('SELECT id FROM users WHERE username = ?', candidato)) {
    intento += 1;
    candidato = `${username}_${crypto.randomBytes(2).toString('hex')}`;
    if (intento > 5) break;
  }

  return candidato;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${PUBLIC_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db = await openDb();
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, { message: 'La cuenta de Google no tiene un email asociado.' });
        }

        let user = await db.get('SELECT * FROM users WHERE google_id = ?', profile.id);

        if (!user) {
          user = await db.get('SELECT * FROM users WHERE email = ?', email);

          if (user) {
            await db.run('UPDATE users SET google_id = ? WHERE id = ?', [profile.id, user.id]);
            user.google_id = profile.id;
          }
        }

        if (!user) {
          const firstName = profile.name?.givenName || profile.displayName || 'Usuario';
          const lastName = profile.name?.familyName || 'Google';
          const username = await generarUsernameUnico(db, email.split('@')[0]);
          const randomPassword = crypto.randomBytes(32).toString('hex');
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          const result = await db.run(
            `INSERT INTO users (firstName, lastName, email, username, password, role, google_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, username, hashedPassword, 'patient', profile.id]
          );

          user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
} else {
  console.warn('[Auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no configurados. Login con Google deshabilitado.');
}

export default passport;
