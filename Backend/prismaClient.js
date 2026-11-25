require('dotenv').config();

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./database/generated/prisma');
const { getDatabasePoolConfig } = require('./config');

const databasePoolConfig = getDatabasePoolConfig();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

function createDatabaseClient(connectionString, applicationName) {
  const pool = new Pool({
    application_name: applicationName,
    connectionString,
    connectionTimeoutMillis: databasePoolConfig.connectionTimeoutMillis,
    idleTimeoutMillis: databasePoolConfig.idleTimeoutMillis,
    max: databasePoolConfig.max,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return { pool, prisma: client };
}

const primary = createDatabaseClient(process.env.DATABASE_URL, 'matinee-primary');
const replica = databasePoolConfig.readUrl
  ? createDatabaseClient(databasePoolConfig.readUrl, 'matinee-replica')
  : primary;

function isPrimaryReadRequested(req) {
  const value = req && req.headers ? req.headers['x-matinee-read-consistency'] : null;
  return String(value || '').toLowerCase() === 'primary';
}

function readClientFor(req) {
  return isPrimaryReadRequested(req) ? primary.prisma : replica.prisma;
}

async function disconnectPrisma() {
  await primary.prisma.$disconnect();
  if (replica.prisma !== primary.prisma) await replica.prisma.$disconnect();
  await primary.pool.end();
  if (replica.pool !== primary.pool) await replica.pool.end();
}

module.exports = {
  POOL_SIZE: databasePoolConfig.max,
  databasePoolConfig,
  disconnectPrisma,
  hasReadReplica: replica.prisma !== primary.prisma,
  isPrimaryReadRequested,
  pool: primary.pool,
  prisma: primary.prisma,
  primaryPrisma: primary.prisma,
  readClientFor,
  readPrisma: replica.prisma,
  writePrisma: primary.prisma,
};
