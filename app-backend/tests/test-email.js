/**
 * Email Configuration Test
 * Run: node test-email.js
 */

import { configDotenv } from 'dotenv';
configDotenv();

import nodemailer from 'nodemailer';

const testEmail = async () => {
  console.log('\n=== Testing Email Configuration ===\n');
  
  console.log('Configuration:');
  console.log(`  Host: ${process.env.EMAIL_HOST}`);
  console.log(`  Port: ${process.env.EMAIL_PORT}`);
  console.log(`  User: ${process.env.EMAIL_USER}`);
  console.log(`  Password: ${process.env.EMAIL_PASSWORD?.substring(0, 4)}****`);
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    console.log('Testing connection...');
    await transporter.verify();
    console.log('✓ SMTP Connection: SUCCESS\n');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email from Auth API',
      html: `
        <h2>Email Configuration Test</h2>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><em>Sent from your Authentication API</em></p>
      `,
    });

    console.log('✓ Email Sent: SUCCESS');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`\n✓ Check your inbox at: ${process.env.EMAIL_USER}\n`);
    
  } catch (error) {
    console.error('✗ Email Test FAILED\n');
    console.error('Error:', error.message);
    console.error('\nCommon Issues:');
    console.error('  1. Invalid Gmail App Password');
    console.error('  2. 2-Factor Authentication not enabled');
    console.error('  3. Gmail blocking "less secure apps"');
    console.error('  4. Wrong SMTP host/port');
    console.error('\nSolution:');
    console.error('  → Generate new App Password: https://myaccount.google.com/apppasswords\n');
  }
};

testEmail();
