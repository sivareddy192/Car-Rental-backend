import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error('WARNING: MONGODB_URI is not defined in environment variables.');
}

async function connectDB() {
  try {
    const databaseName = process.env.MONGODB_DB_NAME;
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: databaseName,
    });
    console.log(`connect DB: ${connection.connection.name}`);
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

export { connectDB };
export default connectDB;
