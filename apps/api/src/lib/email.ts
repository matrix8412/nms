import nodemailer from 'nodemailer';
import { env } from './env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
});

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
