import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import logger from "../config/logger.js";

// Create mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Initialize Mailgen for email templates
const mailGenerator = new Mailgen({
  theme: "default",
  product: {
    name: "YuvaHire Job Portal",
    link: process.env.FRONTEND_URL || "http://localhost:3000",
    logo: process.env.LOGO_URL,
  },
});

/**
 * Send email verification link to user
 */
export const sendVerificationEmail = async (user, token) => {
  try {
    const verifyUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${token}`;

    // Generate email content
    const email = {
      body: {
        name: user.name || user.email,
        intro: "Welcome to YuvaHire Job Portal! Please verify your email to activate your account.",
        action: {
          instructions: "Click the button below to verify your email (valid for 10 minutes):",
          button: {
            color: "#4F46E5", // Indigo color for YuvaHire theme
            text: "Verify Email",
            link: verifyUrl,
          },
        },
        outro:
          "If you did not create an account with YuvaHire Job Portal, please ignore this email.",
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: user.email,
      subject: "Verify your YuvaHire Job Portal account",
      html: emailBody,
      text: emailText,
    });

    logger.info(`Verification email sent to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send verification email: ${error.message}`, { error });
    throw new Error("Failed to send verification email");
  }
};

/**
 * Send password reset email to user
 */
export const sendPasswordResetEmail = async (user, token) => {
  try {
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${token}`;

    // Generate email content
    const email = {
      body: {
        name: user.name || user.email,
        intro: "You have requested to reset your password for your YuvaHire Job Portal account.",
        action: {
          instructions: "Click the button below to set a new password (valid for 10 minutes):",
          button: {
            color: "#4F46E5", // Indigo color for YuvaHire theme
            text: "Reset Password",
            link: resetUrl,
          },
        },
        outro: "If you didn't request a password reset, you can safely ignore this email.",
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: user.email,
      subject: "Reset your YuvaHire Job Portal password",
      html: emailBody,
      text: emailText,
    });

    logger.info(`Password reset email sent to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send password reset email: ${error.message}`, { error });
    throw new Error("Failed to send password reset email");
  }
};

/**
 * Send admin invitation email with temporary password
 */
export const sendInvitationEmail = async (user, token, tempPassword, collegeName) => {
  try {
    const verifyUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${token}`;

    // Generate email content
    const email = {
      body: {
        name: user.name || user.email,
        intro: `You have been invited to join YuvaHire Job Portal as an administrator for ${collegeName}!`,
        action: {
          instructions:
            "Click the button below to verify your email and activate your account (valid for 10 minutes):",
          button: {
            color: "#4F46E5", // Indigo color for YuvaHire theme
            text: "Verify Email",
            link: verifyUrl,
          },
        },
        table: {
          data: [
            {
              key: "Email",
              value: user.email,
            },
            {
              key: "Temporary Password",
              value: tempPassword,
            },
          ],
          columns: {
            // Customize the column widths
            customWidth: {
              key: "33%",
              value: "67%",
            },
          },
        },
        outro: [
          "Please use the temporary password to log in, and change it immediately after logging in.",
          "If you did not expect this invitation, please ignore this email.",
        ],
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: user.email,
      subject: "You've been invited to join YuvaHire Job Portal as an Administrator",
      html: emailBody,
      text: emailText,
    });

    logger.info(`Admin invitation email sent to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send invitation email: ${error.message}`, { error });
    throw new Error("Failed to send invitation email");
  }
};

/**
 * Notify super admin about new admin application
 */
export const notifySuperAdmin = async (superAdmin, applicant, college, application) => {
  try {
    const applicationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/admin/applications/${application.id}`;

    // Generate email content
    const email = {
      body: {
        name: superAdmin.name || superAdmin.email,
        intro: "A new college admin application has been submitted and requires your review.",
        table: {
          data: [
            {
              key: "Applicant Name",
              value: applicant.name,
            },
            {
              key: "Applicant Email",
              value: applicant.email,
            },
            {
              key: "College Name",
              value: college.name,
            },
            {
              key: "College Location",
              value: college.location,
            },
            {
              key: "Application ID",
              value: application.id.toString(),
            },
            {
              key: "Submitted On",
              value: new Date(application.createdAt).toLocaleString(),
            },
          ],
        },
        action: {
          instructions: "Click the button below to review this application:",
          button: {
            color: "#4F46E5",
            text: "Review Application",
            link: applicationUrl,
          },
        },
        outro: "This application requires your approval before the college can be activated.",
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: superAdmin.email,
      subject: `New College Admin Application: ${college.name}`,
      html: emailBody,
      text: emailText,
    });

    logger.info(`Admin application notification sent to super admin ${superAdmin.email}`);
  } catch (error) {
    logger.error(`Failed to send admin application notification: ${error.message}`, { error });
    throw new Error("Failed to send admin application notification");
  }
};

/**
 * Send approval email to admin applicant
 */
export const sendAdminApprovalEmail = async (email, collegeName) => {
  try {
    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`;

    // Generate email content
    const email = {
      body: {
        intro: "Great news! Your application to become an admin for a college has been approved.",
        table: {
          data: [
            {
              key: "College",
              value: collegeName,
            },
            {
              key: "Status",
              value: "APPROVED",
            },
          ],
        },
        action: {
          instructions:
            "You can now log in to the YuvaHire Job Portal and start managing your college:",
          button: {
            color: "#22c55e", // Green color
            text: "Login to YuvaHire",
            link: loginUrl,
          },
        },
        outro: "Thank you for joining YuvaHire Job Portal. We're excited to have you on board!",
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: email,
      subject: `Your Admin Application for ${collegeName} has been Approved!`,
      html: emailBody,
      text: emailText,
    });

    logger.info(`Admin approval email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send admin approval email: ${error.message}`, { error });
    throw new Error("Failed to send admin approval email");
  }
};

/**
 * Send rejection email to admin applicant
 */
export const sendAdminRejectionEmail = async (email, comments) => {
  try {
    // Generate email content
    const email = {
      body: {
        intro: "We've reviewed your application to become a college admin on YuvaHire Job Portal.",
        table: {
          data: [
            {
              key: "Application Status",
              value: "REJECTED",
            },
          ],
        },
        content: comments
          ? `Reviewer comments: ${comments}`
          : "Unfortunately, your application has not been approved at this time.",
        outro: [
          "If you believe this was a mistake or would like to apply again with additional information, please contact our support team.",
          "Thank you for your interest in YuvaHire Job Portal.",
        ],
      },
    };

    // Generate HTML and plain text versions of the email
    const emailBody = mailGenerator.generate(email);
    const emailText = mailGenerator.generatePlaintext(email);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@yuvahire.com",
      to: email,
      subject: "Update on Your YuvaHire Admin Application",
      html: emailBody,
      text: emailText,
    });

    logger.info(`Admin rejection email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send admin rejection email: ${error.message}`, { error });
    throw new Error("Failed to send admin rejection email");
  }
};

// Export all email services
export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  notifySuperAdmin,
  sendAdminApprovalEmail,
  sendAdminRejectionEmail,
};
