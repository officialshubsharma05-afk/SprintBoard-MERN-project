const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const issueRoutes = require('./routes/issueRoutes');
const activityRoutes = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');

// Load environment variables from .env
dotenv.config();

// Initialize Express application & HTTP server
const app = express();
const server = http.createServer(app);

// CORS configuration for frontend communication (supports localhost & 127.0.0.1)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: corsOptions,
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  // Join project specific room
  socket.on('join:project', (projectId) => {
    if (projectId) {
      socket.join(`project:${projectId}`);
    }
  });

  socket.on('leave:project', (projectId) => {
    if (projectId) {
      socket.leave(`project:${projectId}`);
    }
  });
});

// Make io accessible globally in Express routes via req.app.get('io')
app.set('io', io);

// Connect to MongoDB (Atlas or In-Memory fallback)
connectDB();

// Express JSON & URL-encoded body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Silence favicon 404s
app.get('/favicon.ico', (req, res) => res.status(204).end());

// HTTP request logger in development mode
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/**
 * @desc    Health Check Endpoint to verify server, database, and socket connectivity
 * @route   GET /api/health
 * @access  Public
 */
app.get('/api/health', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  res.status(200).json({
    status: 'ok',
    service: 'SprintBoard Backend API',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    realtime: {
      socketEnabled: true,
      connectedClients: io.engine.clientsCount,
    },
    database: {
      status: dbStateMap[dbState] || 'unknown',
      connected: isDbConnected,
      host: isDbConnected ? mongoose.connection.host : null,
      name: isDbConnected ? mongoose.connection.name : null,
    },
  });
});

// Database connectivity guard for API routes to prevent hanging when DB is disconnected
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is initializing or not connected. Please wait a moment or configure server/.env.',
      status: 'db_disconnected',
    });
  }

  next();
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Serve frontend static build if accessing port 5000 directly
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Helpful fallback landing page if client/dist hasn't been built yet
  app.get('/', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SprintBoard Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; padding: 36px; border-radius: 14px; max-width: 540px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155; }
          h1 { margin-top: 0; color: #818cf8; font-size: 24px; font-weight: 700; }
          p { color: #94a3b8; font-size: 14.5px; line-height: 1.6; margin: 12px 0; }
          ul { color: #cbd5e1; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 16px 0; }
          .actions { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; }
          .btn { display: inline-flex; align-items: center; justify-content: center; background: #6366f1; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
          .btn:hover { background: #4f46e5; }
          .btn-outline { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
          .btn-outline:hover { background: #334155; }
          code { background: #0f172a; padding: 3px 7px; border-radius: 5px; color: #38bdf8; font-family: Consolas, monospace; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 SprintBoard Backend Server is Active</h1>
          <p>The backend REST API and Socket.IO real-time services are operational on <strong>Port 5000</strong>.</p>
          <p>To access the SprintBoard <strong>Frontend UI</strong>:</p>
          <ul>
            <li><strong>Development (Hot-Reload):</strong> Open <a href="http://localhost:5173" style="color: #818cf8; font-weight: 600;">http://localhost:5173</a> (start with <code>npm run client</code> or <code>npm run dev</code>).</li>
            <li><strong>Single-Port Mode:</strong> Run <code>npm run build</code> in the root folder to bundle the production UI directly onto this port.</li>
          </ul>
          <div class="actions">
            <a class="btn" href="http://localhost:5173">Open Frontend (Port 5173)</a>
            <a class="btn btn-outline" href="/api/health">Check API Health</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

// Centralized error handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] SprintBoard running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Socket.IO] Real-Time WebSockets active on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection Error]:', err.message);
});

module.exports = { app, server, io };
