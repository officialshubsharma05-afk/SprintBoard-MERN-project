const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');
const Task = require('../models/Task');

/**
 * @desc    Get all projects (Role-Based: Members see own projects; Admins can see all)
 * @route   GET /api/projects
 * @access  Private (Authentication required)
 */
const getProjects = async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;

    // Role-based scoping: Admins can view all projects, members only view projects created by them
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: sanitized, $options: 'i' };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email avatar role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single project details by ID with ownership/role verification
 * @route   GET /api/projects/:id
 * @access  Private (Authentication required)
 */
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email avatar role');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Ownership check: Admin or project creator
    const creatorId = project.createdBy._id
      ? project.createdBy._id.toString()
      : project.createdBy.toString();

    if (creatorId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this project',
      });
    }

    // Count associated issues for project metrics
    const issueCount = await Issue.countDocuments({ projectId: project._id });
    const completedIssueCount = await Issue.countDocuments({
      projectId: project._id,
      status: 'Done',
    });

    return res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        issueCount,
        completedIssueCount,
        taskCount: issueCount, // compatibility alias
        completedTaskCount: completedIssueCount, // compatibility alias
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new project assigned to the authenticated user
 * @route   POST /api/projects
 * @access  Private (Authentication required)
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description, status, priority, dueDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
      });
    }

    // Create project referencing the authenticated user in createdBy
    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      status: status || 'active',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      createdBy: req.user._id,
    });

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email avatar role');

    // Emit real-time WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:created', populatedProject);
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a project with ownership/role verification
 * @route   PUT /api/projects/:id
 * @access  Private (Authentication required)
 */
const updateProject = async (req, res, next) => {
  try {
    const { name, description, status, priority, dueDate } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Ownership check: Admin or creator can manage project
    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this project',
      });
    }

    // Update allowed fields
    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (status !== undefined) project.status = status;
    if (priority !== undefined) project.priority = priority;
    if (dueDate !== undefined) project.dueDate = dueDate || null;

    const updatedProject = await project.save();
    const populatedProject = await Project.findById(updatedProject._id)
      .populate('createdBy', 'name email avatar role');

    // Emit real-time WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:updated', populatedProject);
    }

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a project and all associated issues & activities with ownership/role verification
 * @route   DELETE /api/projects/:id
 * @access  Private (Authentication required)
 */
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Ownership check: Admin or creator
    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this project',
      });
    }

    // Cascade delete associated Issues and Activities
    await Issue.deleteMany({ projectId: req.params.id });
    await Activity.deleteMany({ projectId: req.params.id });
    await Task.deleteMany({ project: req.params.id });

    // Delete project
    await project.deleteOne();

    // Emit real-time WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:deleted', { projectId: req.params.id });
    }

    return res.status(200).json({
      success: true,
      message: 'Project and all associated issues deleted successfully',
      deletedProjectId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
