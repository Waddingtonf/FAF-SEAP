const xlsx = require('xlsx');

const painelWb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const painelData = xlsx.utils.sheet_to_json(painelWb.Sheets[painelWb.SheetNames[0]], { defval: null });

const executed = {};
const seen = new Set();
let lastConta = null;
for (const row of painelData) {
    const raw = row['CONTA BANCARIA'];
    if (raw) lastConta = raw.toString().trim().replace(/\s/g, '').replace('.', '');

    const ob = row['ORDEM BANCÁRIA Nº'];
    const val = row[' VALOR DA ORDEM BANCÁRIA'];
    if (ob && typeof val === 'number' && !seen.has(ob)) {
        seen.add(ob);
        executed[lastConta] = (executed[lastConta] || 0) + val;
    }
}

const contas2016 = ['11935-0', '11515-0', '11936-9', '11937-7', '11516-9'];
console.log('--- FAF 2016 Execução por Conta ---');
contas2016.forEach(c => {
    console.log(`${c}: R$ ${executed[c] ? executed[c].toFixed(2) : 0}`);
});

console.log('\nOutras contas not in 2016 list:');
for (const [k, v] of Object.entries(executed)) {
    if (!contas2016.includes(k)) console.log(`  ${k}: R$ ${v.toFixed(2)}`);
}
