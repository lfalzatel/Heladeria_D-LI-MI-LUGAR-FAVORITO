const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('dli_backup_2026-05-26.json', 'utf8'));

const cleanSupplies = backup.supplies.map(s => {
  const { id, createdAt, updatedAt, ...rest } = s;
  return rest;
});

let suppliesStr = JSON.stringify(cleanSupplies, null, 2);
suppliesStr = suppliesStr.replace(/"([^"]+)":/g, '$1:');

const seedServicePath = 'src/services/seedService.ts';
let seedCode = fs.readFileSync(seedServicePath, 'utf8');

const regex = /export const DEFAULT_SUPPLIES = \[[\s\S]*?\];/;
seedCode = seedCode.replace(regex, 'export const DEFAULT_SUPPLIES = ' + suppliesStr + ';');

fs.writeFileSync(seedServicePath, seedCode);
console.log('Successfully updated seedService.ts from backup!');
