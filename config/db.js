import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let cachedPromise = null;

async function connectDB() {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting, wait for that same promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables.';
    console.error(`[MongoDB Error]: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const databaseName = process.env.MONGODB_DB_NAME || 'royaldrives';

  const opts = {
    dbName: databaseName,
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000, // Fail fast after 5s to avoid Vercel 10s invocation timeout
    connectTimeoutMS: 5000,
  };

  cachedPromise = mongoose
    .connect(uri, opts)
    .then((mongooseInstance) => {
      console.log(`Connected to MongoDB: ${mongooseInstance.connection.name}`);
      return mongooseInstance.connection;
    })
    .catch((err) => {
      cachedPromise = null;
      console.error('[MongoDB Error]:', err.message);
      throw err;
    });

  return cachedPromise;
}

export { connectDB };
export default connectDB;
