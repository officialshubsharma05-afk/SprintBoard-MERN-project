const Activity = require('../models/Activity');

/**
 * Persists an activity event log directly into MongoDB
 * @param {Object} params - { userId, issueId, projectId, action, details }
 */
const logActivity = async ({ userId, issueId, projectId, action, details = {} }) => {
  try {
    const activity = await Activity.create({
      userId,
      issueId,
      projectId,
      action,
      details,
    });
    return activity;
  } catch (error) {
    console.error('[Activity Logger Error]: Failed to save activity record:', error.message);
    return null;
  }
};

module.exports = { logActivity };
