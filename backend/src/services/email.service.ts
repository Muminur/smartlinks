import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { IUserDocument } from '../models/user.model';

class EmailService {
  private transporter: Transporter;

  constructor() {
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
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready to send messages');
    } catch (error) {
      logger.error('Email service configuration error:', error);
    }
  }

  async sendVerificationEmail(user: IUserDocument, token: string): Promise<void> {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      from: `"TinyURL Clone" <${config.EMAIL_FROM}>`,
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
              <h1 style="color: white; margin: 0;">Welcome to TinyURL Clone!</h1>
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
              <p>&copy; ${new Date().getFullYear()} TinyURL Clone. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Welcome to TinyURL Clone!

        Hello ${user.name},

        Thank you for signing up! Please verify your email address by clicking the link below:

        ${verificationUrl}

        This link will expire in 24 hours. If you didn't create an account, please ignore this email.

        Best regards,
        TinyURL Clone Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending verification email to ${user.email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(user: IUserDocument, token: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: `"TinyURL Clone" <${config.EMAIL_FROM}>`,
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
              <p>&copy; ${new Date().getFullYear()} TinyURL Clone. All rights reserved.</p>
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
        TinyURL Clone Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending password reset email to ${user.email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(user: IUserDocument): Promise<void> {
    const dashboardUrl = `${config.FRONTEND_URL}/dashboard`;

    const mailOptions = {
      from: `"TinyURL Clone" <${config.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Welcome to TinyURL Clone!',
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
              <p>&copy; ${new Date().getFullYear()} TinyURL Clone. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Welcome to TinyURL Clone!

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
        TinyURL Clone Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending welcome email to ${user.email}:`, error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  async sendPasswordChangedEmail(user: IUserDocument): Promise<void> {
    const mailOptions = {
      from: `"TinyURL Clone" <${config.EMAIL_FROM}>`,
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
              <p>&copy; ${new Date().getFullYear()} TinyURL Clone. All rights reserved.</p>
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
        TinyURL Clone Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password changed notification sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending password changed email to ${user.email}:`, error);
      // Don't throw error - it's not critical
    }
  }
}

export const emailService = new EmailService();
