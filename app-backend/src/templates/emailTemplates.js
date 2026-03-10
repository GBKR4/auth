// Styled HTML email templates
// Uses inline CSS so they render correctly in all email clients

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f4f7fa;
  margin: 0;
  padding: 0;
`;

const wrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auth App</title>
</head>
<body style="${BASE_STYLES}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
          style="background:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden; max-width:600px; width:100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 36px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.5px;">🔐 Auth App</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f7fa; padding:20px 40px; text-align:center; border-top:1px solid #e8ecf0;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                This email was sent by Auth App. If you did not request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

const btnStyle = `
  display:inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color:#ffffff !important;
  text-decoration:none;
  padding:14px 32px;
  border-radius:8px;
  font-size:15px;
  font-weight:600;
  letter-spacing:0.3px;
  margin-top:24px;
`;

export const verificationEmailTemplate = (verificationLink) => wrap(`
  <h2 style="margin:0 0 12px; font-size:22px; color:#1f2937; font-weight:700;">Verify your email address</h2>
  <p style="margin:0 0 8px; font-size:15px; color:#4b5563; line-height:1.6;">
    Thanks for signing up! Please verify your email address to activate your account.
    This link expires in <strong>24 hours</strong>.
  </p>
  <p style="text-align:center;">
    <a href="${verificationLink}" style="${btnStyle}">Verify Email Address</a>
  </p>
  <p style="margin:24px 0 0; font-size:13px; color:#9ca3af;">
    Or copy this link into your browser:<br>
    <span style="color:#667eea; word-break:break-all;">${verificationLink}</span>
  </p>
`);

export const passwordResetEmailTemplate = (resetLink) => wrap(`
  <h2 style="margin:0 0 12px; font-size:22px; color:#1f2937; font-weight:700;">Reset your password</h2>
  <p style="margin:0 0 8px; font-size:15px; color:#4b5563; line-height:1.6;">
    We received a request to reset your password. Click the button below to choose a new one.
    This link expires in <strong>1 hour</strong>.
  </p>
  <p style="text-align:center;">
    <a href="${resetLink}" style="${btnStyle}">Reset Password</a>
  </p>
  <p style="margin:24px 0 0; font-size:13px; color:#9ca3af;">
    If you didn't request a password reset, you can safely ignore this email.
    Your password will not change.<br><br>
    Or copy this link into your browser:<br>
    <span style="color:#667eea; word-break:break-all;">${resetLink}</span>
  </p>
`);

export const welcomeEmailTemplate = (firstName) => wrap(`
  <h2 style="margin:0 0 12px; font-size:22px; color:#1f2937; font-weight:700;">
    Welcome${firstName ? `, ${firstName}` : ''}! 🎉
  </h2>
  <p style="margin:0 0 8px; font-size:15px; color:#4b5563; line-height:1.6;">
    Your email has been verified and your account is now active. We're thrilled to have you on board.
  </p>
  <p style="margin:16px 0 0; font-size:15px; color:#4b5563; line-height:1.6;">
    If you have any questions or need help, just reply to this email — we're here for you.
  </p>
`);
