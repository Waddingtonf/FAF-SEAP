const xlsx = require('xlsx');
const fs = require('fs');

// Check which contas appear in PAINEL and what ANO FAF 2 / TIPO DE CONTA they have
const wb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

const byAnoConta = {};
for (const row of rows) {
    const conta = row['CONTA BANCARIA'];
    const ano = row['ANO FAF 2'];
    const tipo = row['TIPO DE CONTA'];
    if (conta && ano) {
        const key = `${conta}|${tipo}|${ano}`;
        if (!byAnoConta[key]) byAnoConta[key] = 0;
        byAnoConta[key]++;
    }
}
// Sort and print unique combinations
const sorted = Object.entries(byAnoConta).sort(([a], [b]) => a.localeCompare(b));
const out = sorted.map(([k, v]) => `${k} (${v} linhas)`);
fs.writeFileSync('C:/tmp/painel_contas.txt', out.join('\n'));
console.log(out.join('\n'));
