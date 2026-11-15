const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * @desc    Get tasks (optionally filtered by projectId, assignedTo, status, priority)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const { projectId, status, priority, assignedTo, search } = req.query;

    const query = {};

    if (projectId) {
      query.project = projectId;
    }
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name status priority')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name status priority owner members');

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;

    if (!title || !project) {
      res.status(400);
      throw new Error('Task title and project reference are required');
    }

    // Verify project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      res.status(404);
      throw new Error('Project not found');
    }

    // Calculate next order in column
    const highestOrderTask = await Task.findOne({
      project,
      status: status || 'todo',
    }).sort({ order: -1 });

    const order = highestOrderTask ? highestOrderTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description: description || '',
      project,
      assignedTo: assignedTo || null,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      order,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name status priority');

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update task details or status
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name status priority');

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
