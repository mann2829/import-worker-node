import dotenv from 'dotenv';

import { Dialect } from 'sequelize';

dotenv.config();

const config = {
  local: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password@123',
    database: process.env.DB_NAME || 'rds',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres' as Dialect, // Explicitly set the type
    logging: false, // Disable logging if not needed
  },
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password@123',
    database: process.env.DB_NAME || 'rds',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres' as Dialect, // Explicitly set the type
    logging: false, // Disable logging if not needed
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password@123',
    database: process.env.DB_NAME || 'rds',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres' as Dialect, // Explicitly set the type
    logging: false, // Disable logging if not needed
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password@123',
    database: process.env.DB_NAME || 'rds',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres' as Dialect, // Explicitly set the type
    logging: false, // Disable logging if not needed
  },
};

export default config;
