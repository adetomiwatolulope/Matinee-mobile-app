require('dotenv').config();

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./database/generated/prisma');

const POOL_SIZE = 10;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function disconnectPrisma() {
  await prisma.$disconnect();
  await pool.end();
}

module.exports = {
  POOL_SIZE,
  disconnectPrisma,
  pool,
  prisma,
};
