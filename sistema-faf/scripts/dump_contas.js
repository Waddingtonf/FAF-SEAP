const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

console.log('Columns:', Object.keys(rows[0]));

const contas = new Set();
for (const row of rows) {
    if (row['CONTA BANCARIA']) {
        contas.add(row['CONTA BANCARIA'].toString().trim());
    }
}
console.log('Contas encontradas:', Array.from(contas).sort());
