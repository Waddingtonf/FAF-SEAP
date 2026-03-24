const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('../Controle FAFs.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
fs.writeFileSync('C:/tmp/controle_faf_dump.json', JSON.stringify(data.slice(0, 50), null, 2));
