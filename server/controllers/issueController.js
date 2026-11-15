const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const { logActivity } = require('../utils/activityLogger');

/**
 * Helper to normalize and validate Status filter values
 * Supports: 'To Do', 'to-do', 'todo', 'In Progress', 'in-progress', 'Done', 'done'
 */
const normalizeStatus = (status) => {
  if (!status) return null;
  const clean = status.trim().toLowerCase().replace(/_/g, '-');
  if (clean === 'to do' || clean === 'todo' || clean === 'to-do') return 'To Do';
  if (clean === 'in progress' || clean === 'in_progress' || clean === 'in-progress') return 'In Progress';
  if (clean === 'done' || clean === 'completed') return 'Done';
  return null;
};

/**
 * Helper to normalize and validate Priority filter values
 * Supports: 'Low', 'low', 'Medium', 'medium', 'High', 'high'
 */
const normalizePriority = (priority) => {
  if (!priority) return null;
  const clean = priority.trim().toLowerCase();
  if (clean === 'low') return 'Low';
  if (clean === 'medium') return 'Medium';
  if (clean === 'high') return 'High';
  return null;
};

/**
 * @desc    Get all issues with advanced backend filtering (status, priority, projectId, search, pagination)
 * @route   GET /api/issues
 * @access  Private (Authentication required)
 * @query   ?status=in-progress&priority=high&projectId=123&search=keyword&page=1&limit=10
 */
const getIssues = async (req, res, next) => {
  try {
    const { projectId, status, priority, search, page, limit } = req.query;

    const isAdmin = req.user.role === 'admin';

    // 1. Restrict results to projects owned by user (unless admin)
    const userProjects = isAdmin
      ? await Project.find({}).select('_id')
      : await Project.find({ createdBy: req.user._id }).select('_id');
    const userProjectIds = userProjects.map((p) => p._id.toString());

    // 2. Construct MongoDB query filters
    const query = {};

    // Filter by Project
    if (projectId && projectId.trim()) {
      const cleanProjectId = projectId.trim();

      if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          data: [],
          appliedFilters: { projectId: cleanProjectId, invalid: true },
        });
      }

      // Authorization check: Verify user owns project or is admin
      if (!isAdmin && !userProjectIds.includes(cleanProjectId)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to view issues for this project',
        });
      }

      query.projectId = cleanProjectId;
    } else {
      // Default: Scope across all allowed projects
      query.projectId = { $in: userProjectIds };
    }

    // Filter by Status (supports 'to-do', 'in-progress', 'done', etc.)
    if (status && status.trim()) {
      const validStatus = normalizeStatus(status);
      if (validStatus) {
        query.status = validStatus;
      } else {
        query.status = '__NON_EXISTENT_STATUS__';
      }
    }

    // Filter by Priority (supports 'low', 'medium', 'high', etc.)
    if (priority && priority.trim()) {
      const validPriority = normalizePriority(priority);
      if (validPriority) {
        query.priority = validPriority;
      } else {
        query.priority = '__NON_EXISTENT_PRIORITY__';
      }
    }

    // Search filter by issue title (case-insensitive with sanitized regex)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: sanitizedSearch, $options: 'i' };
    }

    // 3. Pagination Support (Bonus Challenge)
    const hasPagination = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Issue.countDocuments(query);

    let queryBuilder = Issue.find(query)
      .populate('projectId', 'name status priority')
      .populate('createdBy', 'name email avatar role')
      .sort({ createdAt: -1 });

    if (hasPagination) {
      queryBuilder = queryBuilder.skip(skip).limit(limitNum);
    }

    const issues = await queryBuilder;

    return res.status(200).json({
      success: true,
      count: issues.length,
      total,
      pagination: hasPagination
        ? {
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total,
          }
        : null,
      data: issues,
      appliedFilters: {
        projectId: projectId || null,
        status: status || null,
        priority: priority || null,
        search: search || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new issue inside a project
 * @route   POST /api/issues
 * @access  Private (Authentication required)
 */
const createIssue = async (req, res, next) => {
  try {
    const { title, description, status, priority, projectId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Issue title is required',
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId is required to associate this issue with a project',
      });
    }

    const finalStatus = normalizeStatus(status) || 'To Do';
    const finalPriority = normalizePriority(priority) || 'Medium';

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'The referenced project does not exist',
      });
    }

    // Role check: Only admin or project creator can add issues
    const isOwner = project.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to create issues for this project',
      });
    }

    const issue = await Issue.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      status: finalStatus,
      priority: finalPriority,
      projectId: project._id,
      createdBy: req.user._id,
    });

    // Record Activity Log
    const activity = await logActivity({
      userId: req.user._id,
      issueId: issue._id,
      projectId: project._id,
      action: `${req.user.name || 'User'} created issue "${issue.title}"`,
      details: {
        event: 'Issue Created',
        title: issue.title,
        status: finalStatus,
        priority: finalPriority,
      },
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('projectId', 'name status priority')
      .populate('createdBy', 'name email avatar role');

    // Broadcast real-time Socket.IO events
    const io = req.app.get('io');
    if (io) {
      io.emit('issue:created', populatedIssue);
      if (activity) {
        const populatedActivity = await Activity.findById(activity._id)
          .populate('userId', 'name email avatar')
          .populate('issueId', 'title status priority');
        io.emit('activity:created', populatedActivity);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: populatedIssue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an issue (title, description, status, priority, projectId)
 * @route   PUT /api/issues/:id
 * @access  Private (Authentication required)
 */
const updateIssue = async (req, res, next) => {
  try {
    const { title, description, status, priority, projectId } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Verify ownership of project or creator role
    const currentProject = await Project.findById(issue.projectId);
    const isProjectOwner =
      currentProject && currentProject.createdBy.toString() === req.user._id.toString();
    const isIssueCreator = issue.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isProjectOwner && !isIssueCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this issue',
      });
    }

    // Destination project verification if moving issue
    if (projectId && projectId.toString() !== issue.projectId.toString()) {
      const destinationProject = await Project.findById(projectId);
      if (!destinationProject) {
        return res.status(404).json({
          success: false,
          message: 'Destination project not found',
        });
      }
      if (destinationProject.createdBy.toString() !== req.user._id.toString() && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to move issues to this project',
        });
      }
      issue.projectId = destinationProject._id;
    }

    // Track previous status for activity logging
    const previousStatus = issue.status;
    let statusChanged = false;
    let newStatusVal = null;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Issue title cannot be empty',
        });
      }
      issue.title = title.trim();
    }

    if (description !== undefined) {
      issue.description = description.trim();
    }

    if (status !== undefined) {
      const finalStatus = normalizeStatus(status);
      if (!finalStatus) {
        return res.status(400).json({
          success: false,
          message: 'Status must be one of: To Do, In Progress, Done',
        });
      }
      if (finalStatus !== previousStatus) {
        statusChanged = true;
        newStatusVal = finalStatus;
      }
      issue.status = finalStatus;
    }

    if (priority !== undefined) {
      const finalPriority = normalizePriority(priority);
      if (!finalPriority) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be one of: Low, Medium, High',
        });
      }
      issue.priority = finalPriority;
    }

    const updatedIssue = await issue.save();

    // Record Activity Log
    let activity = null;
    if (statusChanged) {
      activity = await logActivity({
        userId: req.user._id,
        issueId: updatedIssue._id,
        projectId: updatedIssue.projectId,
        action: `${req.user.name || 'User'} changed issue status from ${previousStatus} to ${newStatusVal}`,
        details: {
          event: 'Issue Status Changed',
          previousStatus,
          newStatus: newStatusVal,
        },
      });
    } else {
      activity = await logActivity({
        userId: req.user._id,
        issueId: updatedIssue._id,
        projectId: updatedIssue.projectId,
        action: `${req.user.name || 'User'} updated issue "${updatedIssue.title}"`,
        details: {
          event: 'Issue Updated',
          title: updatedIssue.title,
        },
      });
    }

    const populated = await Issue.findById(updatedIssue._id)
      .populate('projectId', 'name status priority')
      .populate('createdBy', 'name email avatar role');

    // Broadcast real-time Socket.IO events
    const io = req.app.get('io');
    if (io) {
      io.emit('issue:updated', populated);
      if (statusChanged) {
        io.emit('issue:statusChanged', {
          issue: populated,
          previousStatus,
          newStatus: newStatusVal,
        });
      }
      if (activity) {
        const populatedActivity = await Activity.findById(activity._id)
          .populate('userId', 'name email avatar')
          .populate('issueId', 'title status priority');
        io.emit('activity:created', populatedActivity);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Issue updated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an issue & cleanup its activity logs
 * @route   DELETE /api/issues/:id
 * @access  Private (Authentication required)
 */
const deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    // Verify ownership or admin role
    const currentProject = await Project.findById(issue.projectId);
    const isProjectOwner =
      currentProject && currentProject.createdBy.toString() === req.user._id.toString();
    const isIssueCreator = issue.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isProjectOwner && !isIssueCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this issue',
      });
    }

    const projectId = issue.projectId;

    // Clean up activity records referencing this issue
    await Activity.deleteMany({ issueId: req.params.id });

    // Delete issue
    await issue.deleteOne();

    // Broadcast real-time Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.emit('issue:deleted', {
        issueId: req.params.id,
        projectId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Issue deleted successfully',
      deletedIssueId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  normalizeStatus,
  normalizePriority,
};
