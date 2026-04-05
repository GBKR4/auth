// Email service — uses styled HTML templates
import nodemailer from 'nodemailer';
import { getEmailConfig } from '../config/email.js';
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
} from '../templates/emailTemplates.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const emailConfig = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (to, subject, html) => {
  const emailConfig = getEmailConfig();
  const mailOptions = {
    from: emailConfig.from,
    to,
    subject,
    html,
  };
  await getTransporter().sendMail(mailOptions);
};

export const sendVerificationEmail = async (email, token, clientUrl) => {
  // Verification is handled by the auth server itself — the link goes directly
  // to GET /api/auth/verify/:token on localhost:3000.
  // clientUrl is kept as the post-verification redirect destination (passed as ?redirect=).
  const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:3000';
  const redirectTo   = clientUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${authServerUrl}/api/auth/verify/${token}?redirect=${encodeURIComponent(redirectTo + '/login?verified=true')}`;
  await sendEmail(
    email,
    'Verify Your Email Address',
    verificationEmailTemplate(verificationLink),
  );
};

export const sendPasswordResetEmail = async (email, token, clientUrl) => {
  // Reset form is served by the auth server itself at /reset-password/:token
  const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:3000';
  const redirectTo    = clientUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${authServerUrl}/reset-password/${token}?redirect=${encodeURIComponent(redirectTo + '/login?reset=true')}`;
  await sendEmail(
    email,
    'Reset Your Password',
    passwordResetEmailTemplate(resetLink),
  );
};

export const sendWelcomeEmail = async (email, firstName) => {
  await sendEmail(
    email,
    'Welcome to Auth App!',
    welcomeEmailTemplate(firstName),
  );
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};