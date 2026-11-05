import nodemailer from 'nodemailer';
import { env } from '../config/env'; 

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || process.env.SMTP_HOST,
  port: Number(env.SMTP_PORT || process.env.SMTP_PORT) || 587,
  secure: Number(env.SMTP_PORT || process.env.SMTP_PORT) === 465,
  auth: {
    user: env.SMTP_USER || process.env.SMTP_USER,
    pass: env.SMTP_PASS || process.env.SMTP_PASS,
  },
});

const defaultFrom = env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM_ADDRESS || '"TimeFlow ERP" <noreply@timeflow.com>';

// ==========================================
// Existing Budget Alert Email
// ==========================================
interface BudgetAlertEmailParams {
  to: string;
  subject: string;
  projectName: string;
  employeeName: string;
  taskName?: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  usagePercentage: number;
  threshold: number;
}

export const sendBudgetAlertEmail = async (params: BudgetAlertEmailParams) => {
  const taskContext = params.taskName ? `<li><strong>Task:</strong> ${params.taskName}</li>` : '';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0F172A; padding: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0;">TimeFlow ERP</h2>
      </div>
      <div style="padding: 20px; color: #334155;">
        <p>Hello,</p>
        <p>This is an automated alert regarding the budget consumption for <strong>${params.projectName}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid ${params.usagePercentage >= 100 ? '#ef4444' : '#f59e0b'}; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #0f172a;">Alert: ${params.threshold}% Consumed</h3>
          <ul style="list-style-type: none; padding-left: 0; margin-bottom: 0;">
            <li style="margin-bottom: 8px;"><strong>Project:</strong> ${params.projectName}</li>
            ${taskContext}
            <li style="margin-bottom: 8px;"><strong>Employee:</strong> ${params.employeeName}</li>
            <li style="margin-bottom: 8px;"><strong>Allocated:</strong> ${params.allocatedHours.toFixed(2)} hours</li>
            <li style="margin-bottom: 8px;"><strong>Consumed:</strong> ${params.consumedHours.toFixed(2)} hours</li>
            <li style="margin-bottom: 8px;"><strong>Remaining:</strong> ${params.remainingHours.toFixed(2)} hours</li>
            <li><strong>Current Usage:</strong> ${params.usagePercentage.toFixed(2)}%</li>
          </ul>
        </div>
        
        <p><strong>Action Required:</strong> ${params.usagePercentage >= 100 ? 'The allocated budget has been completely exhausted. Any further time entries may require override permissions.' : 'Please review the remaining authorized time and plan accordingly.'}</p>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated message from TimeFlow ERP. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: defaultFrom,
      to: params.to,
      subject: params.subject,
      html: htmlContent,
    });
  } catch (error) {
    console.error('[EmailService] Failed to send budget alert email:', error);
  }
};

// ==========================================
// 🟢 NEW: OTP Verification Email
// ==========================================
export const sendOTPVerificationEmail = async (email: string, name: string, otp: string) => {
  try {
    await transporter.sendMail({
      from: defaultFrom,
      to: email,
      subject: 'Verify your TimeFlow ERP Account',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0F172A; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">TimeFlow ERP</h2>
          </div>
          <div style="padding: 20px; color: #334155;">
            <h3 style="color: #2563EB;">Welcome, ${name}!</h3>
            <p>Please use the following 6-digit code to verify your email address and activate your account:</p>
            <div style="background-color: #F1F5F9; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0F172A; border-radius: 8px; margin: 25px 0 border: 1px dashed #cbd5e1;">
              ${otp}
            </div>
            <p style="color: #64748B; font-size: 14px;">This code is valid for 15 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('[EmailService] Error sending OTP:', error);
  }
};

// ==========================================
// 🟢 NEW: Password Reset Email
// ==========================================
export const sendPasswordResetEmail = async (email: string, name: string, resetToken: string) => {
  try {
    const resetUrl = `${env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: defaultFrom,
      to: email,
      subject: 'Reset Your TimeFlow ERP Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0F172A; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">TimeFlow ERP</h2>
          </div>
          <div style="padding: 20px; color: #334155;">
            <h3 style="color: #2563EB;">Password Reset Request</h3>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #64748B; font-size: 14px;">This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('[EmailService] Error sending Reset Email:', error);
  }
};
