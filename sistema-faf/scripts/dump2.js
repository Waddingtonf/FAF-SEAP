const xlsx = require('xlsx');
const fs = require('fs');
const wb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
fs.writeFileSync('C:/tmp/painel_dump.json', JSON.stringify(data.slice(0, 5), null, 2));
