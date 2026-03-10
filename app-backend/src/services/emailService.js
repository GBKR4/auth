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

export const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await sendEmail(
    email,
    'Verify Your Email Address',
    verificationEmailTemplate(verificationLink),
  );
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
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