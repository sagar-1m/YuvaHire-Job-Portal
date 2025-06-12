import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import db from "../libs/db.js";

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = async (userId) => {
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
  // Store refresh token in database
  await db.token.create({
    data: {
      token: refreshToken,
      userId: userId,
      expiresAt: new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY_MS)),
    },
  });

  return refreshToken;
};

const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decoded;
  } catch (error) {
    // Log the specific error for debugging
    console.error(`Token verification failed: ${error.message}`);

    return null;
  }
};

const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    // Check if token exists in database
    const tokenDoc = await db.token.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenDoc) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

const removeRefreshToken = async (token) => {
  await db.token.deleteMany({
    where: {
      token,
    },
  });
};

const clearUserTokens = async (userId) => {
  await db.token.deleteMany({
    where: {
      userId,
    },
  });
};

const generateEmailVerificationToken = () => {
  // Create a random token
  const token = crypto.randomBytes(32).toString("hex");

  // Set expiry (10 mins from now)
  const expiryMs = 1000 * 60 * 10; // 10 minutes
  // Set expiry date
  const expiresAt = new Date(Date.now() + expiryMs);

  return {
    token,
    expiresAt,
  };
};

const verifyEmailToken = async (token) => {
  try {
    // Find user with this verification token that hasn't expired
    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    return user;
  } catch (error) {
    console.error(`Email token verification failed: ${error.message}`);
    return null;
  }
};

const generatePasswordResetToken = () => {
  // Create a random token
  const token = crypto.randomBytes(32).toString("hex");

  // Set expiry (15 mins from now)
  const expiryMs = 1000 * 60 * 15; // 15 minutes
  // Set expiry date
  const expiresAt = new Date(Date.now() + expiryMs);

  return {
    token,
    expiresAt,
  };
};

const verifyPasswordResetToken = async (token) => {
  try {
    // Find user with this reset token that hasn't expired
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    return user;
  } catch (error) {
    console.error(`Password reset token verification failed: ${error.message}`);
    return null;
  }
};

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  removeRefreshToken,
  clearUserTokens,
  generateEmailVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  hashPassword,
  comparePassword,
};
