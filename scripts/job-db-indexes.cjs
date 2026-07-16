#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const indexes = await db.$queryRaw`
    SELECT m.name as table_name, il.name as index_name
    FROM sqlite_master m
    JOIN pragma_index_list(m.name) il
    WHERE m.type='table' ORDER BY m.name`;
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/indexes.json', JSON.stringify(indexes, null, 2));
  console.log('Found ' + indexes.length + ' indexes');
})().finally(() => db.$disconnect());