// Email service
import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email.js';

export const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
});

export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: emailConfig.from,
    to,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
};

export const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const subject = 'Verify Your Email Address';
  const html = `<p>Please verify your email by clicking the link below:</p>
                <a href="${verificationLink}">Verify Email</a>`;
  await sendEmail(email, subject, html);
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const subject = 'Reset Your Password';
  const html = `<p>You can reset your password by clicking the link below:</p>
                <a href="${resetLink}">Reset Password</a>`;
  await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email, firstName) => {
  const subject = 'Welcome to Our Service!';
  const html = `<p>Hi ${firstName},</p>
                <p>Welcome to our service! We're glad to have you on board.</p>`;
  await sendEmail(email, subject, html);
};