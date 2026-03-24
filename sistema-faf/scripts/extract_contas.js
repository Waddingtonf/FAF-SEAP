const xlsx = require('xlsx');

const wb = xlsx.readFile('../Controle FAFs.xlsx');
const sheetMap = {};

for (const sheetName of wb.SheetNames) {
    if (!sheetName.startsWith('20')) continue;
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    const contas = new Set();
    for (const row of data) {
        if (row['Conta']) contas.add(row['Conta'].toString().trim());
    }

    console.log(`Sheet: ${sheetName}`);
    for (const c of contas) {
        console.log(`  Conta: ${c}`);
    }
}
