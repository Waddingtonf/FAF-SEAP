const xlsx = require('xlsx');

const unmappedContas = ['01000-6', '1000-6', '11934-2', '11632-7', '11515-0', '11516-9', '11943-3'];
const painelWb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const painelData = xlsx.utils.sheet_to_json(painelWb.Sheets[painelWb.SheetNames[0]], { defval: null });

const info = {};
unmappedContas.forEach(c => info[c] = { anos: new Set(), total: 0 });

let lastConta = '';
let lastAnoFAF = '';
for (const row of painelData) {
    if (row['CONTA BANCARIA']) lastConta = row['CONTA BANCARIA'].toString().trim().replace(/[\s.]/g, '');
    if (row['ANO FAF']) lastAnoFAF = row['ANO FAF'].toString().trim();

    if (unmappedContas.includes(lastConta)) {
        info[lastConta].anos.add(lastAnoFAF);

        const obVal = row[' VALOR DA ORDEM BANCÁRIA'];
        const obNum = row['ORDEM BANCÁRIA Nº'];
        if (obNum && typeof obVal === 'number') {
            info[lastConta].total += obVal;
        }
    }
}

console.log("=== INFORMAÇÕES DAS CONTAS ÓRFÃS NO PAINEL ===");
for (const c of unmappedContas) {
    console.log(`Conta: ${c} | Anos apontados no Painel: ${Array.from(info[c].anos).join(', ')}`);
}
