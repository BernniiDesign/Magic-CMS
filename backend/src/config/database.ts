import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Auth Database Connection Pool
export const authDB = mysql.createPool({
  host: process.env.DB_AUTH_HOST || 'localhost',
  port: parseInt(process.env.DB_AUTH_PORT || '3306'),
  user: process.env.DB_AUTH_USER || 'trinity',
  password: process.env.DB_AUTH_PASSWORD || 'trinity',
  database: process.env.DB_AUTH_DATABASE || 'auth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Characters Database Connection Pool
export const charactersDB = mysql.createPool({
  host: process.env.DB_CHARACTERS_HOST || 'localhost',
  port: parseInt(process.env.DB_CHARACTERS_PORT || '3306'),
  user: process.env.DB_CHARACTERS_USER || 'trinity',
  password: process.env.DB_CHARACTERS_PASSWORD || 'trinity',
  database: process.env.DB_CHARACTERS_DATABASE || 'characters',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// World Database Connection Pool
export const worldDB = mysql.createPool({
  host: process.env.DB_WORLD_HOST || 'localhost',
  port: parseInt(process.env.DB_WORLD_PORT || '3306'),
  user: process.env.DB_WORLD_USER || 'trinity',
  password: process.env.DB_WORLD_PASSWORD || 'trinity',
  database: process.env.DB_WORLD_DATABASE || 'world',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connections
export const testConnections = async () => {
  try {
    await authDB.query('SELECT 1');
    console.log('✅ Auth database connected');
    
    await charactersDB.query('SELECT 1');
    console.log('✅ Characters database connected');
    
    await worldDB.query('SELECT 1');
    console.log('✅ World database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
};

export default {
  authDB,
  charactersDB,
  worldDB,
  testConnections
};
