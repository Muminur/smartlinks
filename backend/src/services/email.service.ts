import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { IUserDocument } from '../models/user.model';

class EmailService {
  private transporter: Transporter | null = null;
  private emailEnabled: boolean;

  constructor() {
    this.emailEnabled = config.ENABLE_EMAIL;

    if (this.emailEnabled) {
      // Only create transporter if email is enabled
      this.transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_PORT === 465, // true for 465, false for other ports
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASSWORD,
        },
      });

      // Verify connection configuration
      this.verifyConnection();
    } else {
      logger.warn('Email service is DISABLED. Email notifications will be logged but not sent.');
      logger.info('To enable email service, set ENABLE_EMAIL=true in your .env file');
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service is ready to send messages');
    } catch (error) {
      logger.error('Email service configuration error:', error);
      logger.warn('Email service will continue in mock mode. Emails will be logged but not sent.');
      // Don't throw error - allow app to continue
      this.emailEnabled = false;
      this.transporter = null;
    }
  }

  private isEmailEnabled(): boolean {
    return this.emailEnabled && this.transporter !== null;
  }

  private logEmailToConsole(mailOptions: any): void {
    logger.info('='.repeat(80));
    logger.info('EMAIL MOCK MODE - Email not sent (ENABLE_EMAIL is disabled)');
    logger.info('='.repeat(80));
    logger.info(`From: ${mailOptions.from}`);
    logger.info(`To: ${mailOptions.to}`);
    logger.info(`Subject: ${mailOptions.subject}`);
    logger.info('-'.repeat(80));
    logger.info('Plain Text Content:');
    logger.info(mailOptions.text);
    logger.info('='.repeat(80));
  }

  async sendVerificationEmail(user: IUserDocument, token: string): Promise<void> {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      from: `"Shortlinks" <${config.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to Shortlinks!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #667eea;">Hello ${user.name},</h2>
              <p>Thank you for signing up! Please verify your email address to activate your account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <p style="color: #667eea; word-break: break-all; font-size: 14px;">${verificationUrl}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Shortlinks. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Welcome to Shortlinks!

        Hello ${user.name},

        Thank you for signing up! Please verify your email address by clicking the link below:

        ${verificationUrl}

        This link will expire in 24 hours. If you didn't create an account, please ignore this email.

        Best regards,
        Shortlinks Team
      `,
    };

    try {
      if (this.isEmailEnabled()) {
        await this.transporter!.sendMail(mailOptions);
        logger.info(`Verification email sent to ${user.email}`);
      } else {
        // Mock mode - log email to console instead of sending
        this.logEmailToConsole(mailOptions);
        logger.info(`Verification email logged for ${user.email} (not sent - email service disabled)`);
      }
    } catch (error) {
      logger.error(`Error sending verification email to ${user.email}:`, error);
      // In development, log error but don't crash the app
      if (config.NODE_ENV === 'development') {
        logger.warn('Email sending failed in development mode. Continuing...');
        this.logEmailToConsole(mailOptions);
      } else {
        // In production, throw error
        throw new Error('Failed to send verification email');
      }
    }
  }

  async sendPasswordResetEmail(user: IUserDocument, token: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: `"Shortlinks" <${config.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Reset Request</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #f5576c;">Hello ${user.name},</h2>
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #f5576c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <p style="color: #f5576c; word-break: break-all; font-size: 14px;">${resetUrl}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Shortlinks. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Password Reset Request

        Hello ${user.name},

        You requested to reset your password. Click the link below to create a new password:

        ${resetUrl}

        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

        Best regards,
        Shortlinks Team
      `,
    };

    try {
      if (this.isEmailEnabled()) {
        await this.transporter!.sendMail(mailOptions);
        logger.info(`Password reset email sent to ${user.email}`);
      } else {
        // Mock mode - log email to console instead of sending
        this.logEmailToConsole(mailOptions);
        logger.info(`Password reset email logged for ${user.email} (not sent - email service disabled)`);
      }
    } catch (error) {
      logger.error(`Error sending password reset email to ${user.email}:`, error);
      // In development, log error but don't crash the app
      if (config.NODE_ENV === 'development') {
        logger.warn('Email sending failed in development mode. Continuing...');
        this.logEmailToConsole(mailOptions);
      } else {
        // In production, throw error
        throw new Error('Failed to send password reset email');
      }
    }
  }

  async sendWelcomeEmail(user: IUserDocument): Promise<void> {
    const dashboardUrl = `${config.FRONTEND_URL}/dashboard`;

    const mailOptions = {
      from: `"Shortlinks" <${config.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Welcome to Shortlinks!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome!</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome Aboard! 🎉</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #667eea;">Hello ${user.name},</h2>
              <p>Your email has been verified successfully! You're all set to start shortening URLs.</p>
              <h3 style="color: #667eea; margin-top: 30px;">What you can do now:</h3>
              <ul style="line-height: 2;">
                <li>Create short, memorable links</li>
                <li>Track clicks and analytics</li>
                <li>Customize your short URLs</li>
                <li>Share links across platforms</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">Need help? Check out our documentation or contact our support team.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Shortlinks. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Welcome to Shortlinks!

        Hello ${user.name},

        Your email has been verified successfully! You're all set to start shortening URLs.

        What you can do now:
        - Create short, memorable links
        - Track clicks and analytics
        - Customize your short URLs
        - Share links across platforms

        Visit your dashboard: ${dashboardUrl}

        Need help? Check out our documentation or contact our support team.

        Best regards,
        Shortlinks Team
      `,
    };

    try {
      if (this.isEmailEnabled()) {
        await this.transporter!.sendMail(mailOptions);
        logger.info(`Welcome email sent to ${user.email}`);
      } else {
        // Mock mode - log email to console instead of sending
        this.logEmailToConsole(mailOptions);
        logger.info(`Welcome email logged for ${user.email} (not sent - email service disabled)`);
      }
    } catch (error) {
      logger.error(`Error sending welcome email to ${user.email}:`, error);
      // Don't throw error for welcome email - it's not critical
      logger.warn('Welcome email failed but continuing (non-critical)');
    }
  }

  async sendPasswordChangedEmail(user: IUserDocument): Promise<void> {
    const mailOptions = {
      from: `"Shortlinks" <${config.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Your Password Has Been Changed',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Changed</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #11998e;">Hello ${user.name},</h2>
              <p>Your password has been successfully changed.</p>
              <p style="color: #666; margin-top: 20px;">If you did not make this change, please contact our support team immediately.</p>
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404;"><strong>Security Tip:</strong> Never share your password with anyone and use a unique, strong password for your account.</p>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} Shortlinks. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Password Changed

        Hello ${user.name},

        Your password has been successfully changed.

        If you did not make this change, please contact our support team immediately.

        Security Tip: Never share your password with anyone and use a unique, strong password for your account.

        Best regards,
        Shortlinks Team
      `,
    };

    try {
      if (this.isEmailEnabled()) {
        await this.transporter!.sendMail(mailOptions);
        logger.info(`Password changed notification sent to ${user.email}`);
      } else {
        // Mock mode - log email to console instead of sending
        this.logEmailToConsole(mailOptions);
        logger.info(`Password changed notification logged for ${user.email} (not sent - email service disabled)`);
      }
    } catch (error) {
      logger.error(`Error sending password changed email to ${user.email}:`, error);
      // Don't throw error - it's not critical
      logger.warn('Password changed notification failed but continuing (non-critical)');
    }
  }
}

export const emailService = new EmailService();
