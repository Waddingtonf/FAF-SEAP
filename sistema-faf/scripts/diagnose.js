const xlsx = require('xlsx');
const fs = require('fs');

// ===== 1) Dados FAF.xlsx: sum of authorized per Instrumento/Ano/Natureza =====
const dadosWb = xlsx.readFile('../Dados FAF.xlsx');
const dadosSheet = dadosWb.Sheets[dadosWb.SheetNames[0]];
const dadosData = xlsx.utils.sheet_to_json(dadosSheet, { defval: null });

const aggregated = {};
for (const row of dadosData) {
    const instr = (row['Instrumento'] || '').toString().trim();
    const ano = (row['Ano'] || '').toString().trim();
    const natureza = (row['Natureza de despesa'] || '').toString().trim().toUpperCase();
    const valor = typeof row['Valor do repasse federal'] === 'number' ? row['Valor do repasse federal'] : 0;
    let modalidade = natureza;
    if (modalidade === 'OBRA') modalidade = 'OBRAS';
    if (modalidade === 'OBRA-CAPITAL') modalidade = 'OBRAS + CAPITAL';
    const key = `${instr} ${ano}|${modalidade}`;
    aggregated[key] = (aggregated[key] || 0) + valor;
}
console.log('\n== DADOS FAF (authorized per instrument/modalidade) ==');
for (const [key, val] of Object.entries(aggregated)) {
    console.log(`  ${key}: R$ ${val.toFixed(2)}`);
}

// ===== 2) PAINEL: sum of OBs per CONTA BANCARIA =====
const painelWb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const painelSheet = painelWb.Sheets[painelWb.SheetNames[0]];
const painelData = xlsx.utils.sheet_to_json(painelSheet, { defval: null });

// Fill-down
let lastConta = null, lastProc = null, lastOB = null, lastOBValor = null;
const obsByConta = {};
const seenOBs = new Set();  // avoid double-counting same OB

for (const row of painelData) {
    const conta = row['CONTA BANCARIA'] || lastConta;
    lastConta = conta;
    const obNum = row['ORDEM BANCÁRIA Nº'] || lastOB;
    const obValor = row[' VALOR DA ORDEM BANCÁRIA'];

    // Only count OBs that have a value in this row (not duplicates)
    if (row['ORDEM BANCÁRIA Nº'] && obValor && !seenOBs.has(row['ORDEM BANCÁRIA Nº'])) {
        seenOBs.add(row['ORDEM BANCÁRIA Nº']);
        const contaKey = (conta || '').toString().trim();
        obsByConta[contaKey] = (obsByConta[contaKey] || 0) + obValor;
    }
}

console.log('\n== PAINEL OBs (executed per CONTA_BANCARIA) ==');
for (const [k, v] of Object.entries(obsByConta).sort()) {
    console.log(`  ${k}: R$ ${v.toFixed(2)}`);
}
