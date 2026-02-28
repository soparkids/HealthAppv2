import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_ADDRESS =
  process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@ndumed.com";
const APP_NAME = "NdụMed";

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function sendFamilyConsentEmail(
  to: string,
  memberName: string | null | undefined,
  requesterName: string | null | undefined,
  consentToken?: string
): Promise<void> {
  const appUrl = getBaseUrl();
  const greeting = memberName ? `Hi ${memberName}` : "Hi";
  const sender = requesterName || "Someone";

  const acceptUrl = consentToken
    ? `${appUrl}/family/consent?token=${consentToken}&action=accept`
    : `${appUrl}/family`;
  const rejectUrl = consentToken
    ? `${appUrl}/family/consent?token=${consentToken}&action=reject`
    : `${appUrl}/family`;

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: `${sender} wants to share medical records with you on ${APP_NAME}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">${APP_NAME}</h2>
        <p>${greeting},</p>
        <p><strong>${sender}</strong> has added you as a family member on ${APP_NAME} and wants to share their medical records with you.</p>
        <p>Please review this request:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
            Accept
          </a>
          <a href="${rejectUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Decline
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
        <p style="color: #999; font-size: 12px;">Don't have an account? Register at <a href="${appUrl}">${appUrl}</a> first, then click Accept above.</p>
      </div>
    `,
    text: `${greeting},\n\n${sender} wants to share medical records with you on ${APP_NAME}.\n\nAccept: ${acceptUrl}\nDecline: ${rejectUrl}\n\nThis invitation expires in 7 days.`,
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  name?: string | null
): Promise<void> {
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
  const greeting = name ? `Hi ${name}` : "Hi";

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: `Verify your ${APP_NAME} email`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">${APP_NAME}</h2>
        <p>${greeting},</p>
        <p>Thanks for creating your ${APP_NAME} account. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    text: `${greeting},\n\nVerify your ${APP_NAME} email: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.`,
  });
}
