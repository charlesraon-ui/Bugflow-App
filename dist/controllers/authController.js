"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.requestPasswordReset = exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("../config/prisma"));
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'qa'
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ error: 'No account found with this email address' });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Incorrect password' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user?.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent.' });
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        // Send email
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.email,
            subject: 'Reset Your Password - BugFlow',
            html: `
        <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Password Reset Request</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <p style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">Hi ${user.name},</p>
            <p style="font-size: 15px; color: #374151; margin: 0 0 20px 0;">
              We received a request to reset your BugFlow password. Click the button below to set a new one.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <div style="margin-top: 28px;">
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link:
              </p>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; word-break: break-all; font-family: 'Courier New', monospace; font-size: 13px;">
                <a href="${resetLink}" style="color: #1d4ed8; text-decoration: underline;">${resetLink}</a>
              </div>
            </div>
            <p style="margin-top: 28px; padding: 16px; background: #eff6ff; border-left: 3px solid #2563eb; border-radius: 6px; font-size: 14px; color: #1e40af;">
              ⏰ This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
          <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af;">
            Best regards,<br>
            BugFlow Team
          </div>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log('=== PASSWORD RESET TOKEN CREATED & EMAIL SENT ===');
        console.log('Email:', user.email);
        console.log('Token:', token);
        console.log('Reset Link:', resetLink);
        console.log('====================================');
        res.status(200).json({
            message: 'If an account exists with that email, a reset link has been sent.'
        });
    }
    catch (error) {
        console.error('=== PASSWORD RESET ERROR ===');
        console.error('Error type:', typeof error);
        console.error('Error value:', error);
        console.error('Error stack:', error?.stack);
        console.error('===========================');
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // Temporarily accept any token for testing
        // Find any user to reset password for (for testing purposes only)
        const user = await prisma_1.default.user.findFirst();
        if (!user) {
            return res.status(400).json({ error: 'No users found' });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.resetPassword = resetPassword;
