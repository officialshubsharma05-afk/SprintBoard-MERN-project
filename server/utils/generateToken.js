const jwt = require('jsonwebtoken');

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {string} id - The MongoDB User ID
 * @returns {string} - The signed JWT token
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[JWT Warning] JWT_SECRET is not set in environment variables! Using temporary fallback.');
  }

  return jwt.sign(
    { id },
    secret || 'sprintboard_jwt_secret_key_change_in_production',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

module.exports = generateToken;
