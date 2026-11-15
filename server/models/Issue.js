const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [150, 'Issue title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['To Do', 'In Progress', 'Done'],
        message: 'Status must be one of: To Do, In Progress, Done',
      },
      default: 'To Do',
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: 'Priority must be one of: Low, Medium, High',
      },
      default: 'Medium',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Issue must be associated with a projectId'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issue must have a createdBy user reference'],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for backward compatibility
issueSchema.virtual('project').get(function () {
  return this.projectId;
});

module.exports = mongoose.model('Issue', issueSchema);
