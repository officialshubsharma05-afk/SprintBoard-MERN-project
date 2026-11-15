const mongoose = require('mongoose');

// Disable buffering commands so queries fail fast with clear errors instead of hanging
mongoose.set('bufferCommands', false);

let mongoMemoryServer = null;

/**
 * Connects to MongoDB Atlas using Mongoose, with automatic zero-config
 * fallback to an embedded in-memory MongoDB database so SprintBoard works out of the box.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  // 1. If a custom MongoDB connection string is provided (e.g. MongoDB Atlas)
  if (uri && !uri.includes('your_mongodb_connection_string')) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[MongoDB] Atlas Connected successfully: ${conn.connection.host}`);

      // Seed if the database is currently empty
      try {
        const { seedIfEmpty } = require('../utils/seeder');
        await seedIfEmpty();
      } catch (seedErr) {
        console.warn('[MongoDB Seeder Notice]:', seedErr.message);
      }

      return conn;
    } catch (error) {
      console.warn(`[MongoDB Warning] External connection failed (${error.message}). Falling back to in-memory database...`);
    }
  } else {
    console.log('[MongoDB Notice] MONGODB_URI not configured or using placeholder. Activating in-memory database...');
  }

  // 2. Fallback: Start MongoMemoryServer for instant, zero-setup, ready-to-use execution
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();

    const conn = await mongoose.connect(memUri);
    console.log(`[MongoDB] Embedded In-Memory Database connected: ${conn.connection.host}`);
    console.log(`[MongoDB Notice] Ready-to-use mode active! To use your own MongoDB Atlas cluster, paste your URI into server/.env.`);

    // Automatically seed initial demo projects, issues, and activities
    try {
      const { seedIfEmpty } = require('../utils/seeder');
      await seedIfEmpty();
    } catch (seedErr) {
      console.warn('[MongoDB Seeder Notice]:', seedErr.message);
    }

    return conn;
  } catch (memError) {
    console.error('[MongoDB Error] Failed to initialize in-memory database:', memError.message);
    return null;
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost / disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Connection re-established');
});

// Clean up embedded in-memory process on server shutdown
const cleanup = async () => {
  if (mongoMemoryServer) {
    try {
      await mongoose.disconnect();
      await mongoMemoryServer.stop();
    } catch {
      // Ignore on exit
    }
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = connectDB;
