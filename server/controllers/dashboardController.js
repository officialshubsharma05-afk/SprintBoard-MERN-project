const Project = require('../models/Project');
const Issue = require('../models/Issue');

/**
 * @desc    Get real-time dashboard analytics and statistics from MongoDB
 * @route   GET /api/dashboard/stats
 * @access  Private (Authentication required)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const isMineOnly = req.query.mine === 'true';

    // Step 1: Determine projects scope (Admins see workspace-wide unless 'mine' requested)
    const projectFilter = isAdmin && !isMineOnly ? {} : { createdBy: userId };
    const userProjects = await Project.find(projectFilter).select('_id');
    const projectIds = userProjects.map((p) => p._id);

    // Step 2: Compute real-time statistics strictly from MongoDB
    const [
      totalProjects,
      totalIssues,
      openIssues,
      inProgressIssues,
      completedIssues,
      highPriorityIssues,
      recentProjects,
      recentIssues,
    ] = await Promise.all([
      // 1. Total Projects
      Project.countDocuments(projectFilter),

      // 2. Total Issues belonging to scoped projects
      Issue.countDocuments({ projectId: { $in: projectIds } }),

      // 3. Open Issues (status: 'To Do')
      Issue.countDocuments({
        projectId: { $in: projectIds },
        status: 'To Do',
      }),

      // 4. Issues In Progress (status: 'In Progress')
      Issue.countDocuments({
        projectId: { $in: projectIds },
        status: 'In Progress',
      }),

      // 5. Completed Issues (status: 'Done')
      Issue.countDocuments({
        projectId: { $in: projectIds },
        status: 'Done',
      }),

      // 6. High-Priority Issues (priority: 'High')
      Issue.countDocuments({
        projectId: { $in: projectIds },
        priority: 'High',
      }),

      // Recent Projects (latest 5)
      Project.find(projectFilter)
        .populate('createdBy', 'name email avatar role')
        .sort({ createdAt: -1 })
        .limit(5),

      // Recent Issues (latest 6)
      Issue.find({ projectId: { $in: projectIds } })
        .populate('projectId', 'name')
        .populate('createdBy', 'name email avatar role')
        .sort({ createdAt: -1 })
        .limit(6),
    ]);

    // Calculate dynamic completion rate
    const completionRate =
      totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalIssues,
        openIssues,
        inProgressIssues,
        completedIssues,
        highPriorityIssues,
        completionRate,
        recentProjects,
        recentIssues,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
