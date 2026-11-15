const User = require('../models/User');

/**
 * @desc    Get all users (for task assignments and team selection)
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('name email role avatar createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
};
