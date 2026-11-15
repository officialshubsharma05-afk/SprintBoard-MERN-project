const Activity = require('../models/Activity');
const Project = require('../models/Project');

/**
 * @desc    Get recent activity logs (optionally filtered by projectId)
 * @route   GET /api/activities
 * @access  Private (Authentication required)
 */
const getActivities = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const isAdmin = req.user.role === 'admin';

    // Restrict activities to projects owned by the user (or all if admin)
    const userProjects = isAdmin
      ? await Project.find({}).select('_id')
      : await Project.find({ createdBy: req.user._id }).select('_id');
    const userProjectIds = userProjects.map((p) => p._id.toString());

    let query = {};

    if (projectId) {
      if (!isAdmin && !userProjectIds.includes(projectId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to view activity for this project',
        });
      }
      query.projectId = projectId;
    } else {
      query.projectId = { $in: userProjectIds };
    }

    // Sort activities by newest first
    const activities = await Activity.find(query)
      .populate('userId', 'name email avatar role')
      .populate('issueId', 'title status priority')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
};
