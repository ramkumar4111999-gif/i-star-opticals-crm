#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const tables = await db.$queryRaw`SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name`;
  const schema = tables.map(t => t.sql).join('\n\n');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/schema.sql', schema);
  console.log('Exported ' + tables.length + ' table definitions');
})().finally(() => db.$disconnect());