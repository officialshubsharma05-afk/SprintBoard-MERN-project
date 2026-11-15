const express = require('express');
const router = express.Router();
const {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
} = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

// All issue endpoints require authentication
router.use(protect);

router.route('/')
  .get(getIssues)
  .post(createIssue);

router.route('/:id')
  .put(updateIssue)
  .delete(deleteIssue);

module.exports = router;
