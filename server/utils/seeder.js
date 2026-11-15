const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');

const seedDemoData = async () => {
  console.log('[Seeder] Seeding initial SprintBoard demo data...');

  // 1. Create demo users (Admin and Team Member)
  const demoAdmin = await User.create({
    name: 'Hritik Demo Admin',
    email: 'demo@sprintboard.com',
    password: 'Password123!',
    role: 'admin',
  });

  const memberUser = await User.create({
    name: 'Sarah Engineer',
    email: 'sarah@sprintboard.com',
    password: 'Password123!',
    role: 'member',
  });

  // 2. Create Projects
  const project1 = await Project.create({
    name: 'SprintBoard SaaS Platform',
    description: 'Full-stack agile issue tracking and project management platform with real-time statistics and activity logs.',
    status: 'active',
    priority: 'high',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    createdBy: demoAdmin._id,
  });

  const project2 = await Project.create({
    name: 'Mobile API & Real-time Webhooks',
    description: 'REST API microservices, WebSocket notifications, and push notification infrastructure for mobile clients.',
    status: 'planning',
    priority: 'medium',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdBy: demoAdmin._id,
  });

  const project3 = await Project.create({
    name: 'Security & Cloud Infrastructure',
    description: 'SSL certification, zero-trust network boundary, automated MongoDB backups, and Dockerized deployment.',
    status: 'completed',
    priority: 'urgent',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    createdBy: demoAdmin._id,
  });

  // 3. Create Issues
  const issues = await Issue.create([
    {
      title: 'Implement JWT Authentication & bcrypt Hashing',
      description: 'Secure registration and login with token expiration and auth middleware.',
      status: 'Done',
      priority: 'High',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Build Real-Time Dashboard Statistics API',
      description: 'Calculate project counts, issue totals, open, in progress, and high-priority metrics directly from MongoDB.',
      status: 'Done',
      priority: 'High',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Multi-parameter Backend Issue Filtering',
      description: 'Support ?status=...&priority=...&projectId=... simultaneously in MongoDB query parameters.',
      status: 'Done',
      priority: 'Medium',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Debounced Issue Title Search (350ms)',
      description: 'Case-insensitive regex title searching with special character sanitization and multi-tenant security.',
      status: 'In Progress',
      priority: 'High',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Activity Log Timeline on Project Details',
      description: 'Record issue creation, status changes with previous/new status, and general updates.',
      status: 'In Progress',
      priority: 'Medium',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Dark Mode SaaS Theme Support',
      description: 'Add CSS variables toggle for high-contrast dark mode across cards and tables.',
      status: 'To Do',
      priority: 'Low',
      projectId: project1._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Design API Endpoints for Mobile Push Notifications',
      description: 'FCM and APNS integration for mobile alerts on issue status updates.',
      status: 'To Do',
      priority: 'Medium',
      projectId: project2._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'WebSocket Connection Gateway for Live Updates',
      description: 'Real-time duplex communication channel for team member broadcasts.',
      status: 'In Progress',
      priority: 'High',
      projectId: project2._id,
      createdBy: demoAdmin._id,
    },
    {
      title: 'Automate Daily MongoDB Atlas Backup Snapshots',
      description: 'Scheduled backup automation with point-in-time recovery verification.',
      status: 'Done',
      priority: 'High',
      projectId: project3._id,
      createdBy: demoAdmin._id,
    },
  ]);

  // 4. Create Activity Logs
  await Activity.create([
    {
      userId: demoAdmin._id,
      issueId: issues[0]._id,
      projectId: project1._id,
      action: `${demoAdmin.name} created issue "${issues[0].title}"`,
      details: { event: 'Issue Created', title: issues[0].title, status: 'To Do', priority: 'High' },
    },
    {
      userId: demoAdmin._id,
      issueId: issues[0]._id,
      projectId: project1._id,
      action: `${demoAdmin.name} changed issue status from In Progress to Done`,
      details: { event: 'Issue Status Changed', previousStatus: 'In Progress', newStatus: 'Done' },
    },
    {
      userId: demoAdmin._id,
      issueId: issues[3]._id,
      projectId: project1._id,
      action: `${demoAdmin.name} created issue "${issues[3].title}"`,
      details: { event: 'Issue Created', title: issues[3].title, status: 'To Do', priority: 'High' },
    },
    {
      userId: demoAdmin._id,
      issueId: issues[3]._id,
      projectId: project1._id,
      action: `${demoAdmin.name} changed issue status from To Do to In Progress`,
      details: { event: 'Issue Status Changed', previousStatus: 'To Do', newStatus: 'In Progress' },
    },
  ]);

  console.log('[Seeder] Initial demo data seeded successfully!');
  console.log('  Admin Demo Account:   demo@sprintboard.com / Password123!');
  console.log('  Member Demo Account:  sarah@sprintboard.com / Password123!');
};

const seedIfEmpty = async () => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('[Seeder] Database is empty. Auto-seeding initial SprintBoard demo data...');
    await seedDemoData();
  }
};

const importData = async () => {
  try {
    const connectDB = require('../config/db');
    await connectDB();

    console.log('Cleaning existing SprintBoard data...');
    await User.deleteMany();
    await Project.deleteMany();
    await Issue.deleteMany();
    await Activity.deleteMany();

    await seedDemoData();

    console.log('\n=============================================');
    console.log(' SprintBoard Demo Data Successfully Seeded!');
    console.log('=============================================');
    console.log(' Demo Login Credentials:');
    console.log('   Email:    demo@sprintboard.com');
    console.log('   Password: Password123!');
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error(' [Seeder Failed]:', error.message);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    const connectDB = require('../config/db');
    await connectDB();
    console.log('Destroying all SprintBoard data...');
    await User.deleteMany();
    await Project.deleteMany();
    await Issue.deleteMany();
    await Activity.deleteMany();
    console.log('All SprintBoard data successfully destroyed from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error(' [Destroy Failed]:', error.message);
    process.exit(1);
  }
};

// Check if run directly from CLI
if (require.main === module) {
  if (process.argv[2] === '-d' || process.argv[2] === '--destroy') {
    destroyData();
  } else {
    importData();
  }
}

module.exports = {
  seedDemoData,
  seedIfEmpty,
  importData,
  destroyData,
};
