#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const fks = await db.$queryRaw`
    SELECT m.name as table_name, fk."from" as column, fk."table" as ref_table, fk."to" as ref_column
    FROM sqlite_master m
    JOIN pragma_foreign_key_list(m.name) fk
    WHERE m.type='table' ORDER BY m.name, fk.id`;
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/relations.json', JSON.stringify(fks, null, 2));
  console.log('Found ' + fks.length + ' foreign key relationships');
  fks.forEach(r => console.log('  ' + r.table_name + '.' + r.column + ' -> ' + r.ref_table + '.' + r.ref_column));
})().finally(() => db.$disconnect());