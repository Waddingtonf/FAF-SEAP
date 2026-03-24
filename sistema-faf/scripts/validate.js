// Quick validation: check what keys are produced by each function
const xlsx = require('xlsx');
const os = require('os');
const fs = require('fs');
const path = require('path');

// INSTRUMENT MAPPING (same as seed.ts)
const CONTA_MAPPING = {
    '11935-0': { instrumento: 'FAF 2016', modalidade: 'CUSTEIO' },
    '11515-0': { instrumento: 'FAF 2016', modalidade: 'OBRAS' },
    '11936-9': { instrumento: 'FAF 2016', modalidade: 'CAPITAL' },
    '11937-7': { instrumento: 'FAF 2016', modalidade: 'CAPITAL' },
    '11516-9': { instrumento: 'FAF 2016', modalidade: 'CAPITAL' },
    '11938-5': { instrumento: 'FAF 2017', modalidade: 'CUSTEIO' },
    '11939-3': { instrumento: 'FAF 2017', modalidade: 'OBRAS + CAPITAL' },
    '11940-7': { instrumento: 'FAF 2018', modalidade: 'OBRAS + CAPITAL' },
    '11979-2': { instrumento: 'FAF 2019', modalidade: 'CAPITAL' },
    '11980-6': { instrumento: 'FAF 2019', modalidade: 'CUSTEIO' },
    '12392-7': { instrumento: 'FAF 2020', modalidade: 'CAPITAL' },
    '12633-0': { instrumento: 'FAF 2021', modalidade: 'CAPITAL' },
    '12634-9': { instrumento: 'FAF 2021', modalidade: 'CUSTEIO' },
    '12635-7': { instrumento: 'FAF 2021', modalidade: 'OBRAS' },
    '12942-9': { instrumento: 'FAF 2022', modalidade: 'CUSTEIO' },
    '12943-7': { instrumento: 'FAF 2022', modalidade: 'OBRAS' },
    '13259-4': { instrumento: 'FAF 2023', modalidade: 'OBRAS' },
    '13344-2': { instrumento: 'FAF 2023 Voluntário', modalidade: 'CUSTEIO' },
    '13670-0': { instrumento: 'FAF 2024', modalidade: 'OBRAS' },
};

//-- 1. AUTHORIZED from Dados FAF.xlsx --
const dadosWb = xlsx.readFile('../Dados FAF.xlsx');
const dadosData = xlsx.utils.sheet_to_json(dadosWb.Sheets[dadosWb.SheetNames[0]], { defval: null });

const authorized = {};
for (const row of dadosData) {
    const instr = (row['Instrumento'] || '').toString().trim();
    const ano = (row['Ano'] || '').toString().trim();
    let nat = (row['Natureza de despesa'] || '').toString().trim().toUpperCase();
    const val = typeof row['Valor do repasse federal'] === 'number' ? row['Valor do repasse federal'] : 0;
    if (nat === 'OBRA') nat = 'OBRAS';
    if (nat === 'OBRA-CAPITAL') nat = 'OBRAS + CAPITAL';
    const key = `${instr} ${ano}|${nat}`;
    authorized[key] = (authorized[key] || 0) + val;
}

console.log('=== AUTHORIZED KEYS (Dados FAF) ===');
for (const [k, v] of Object.entries(authorized)) {
    console.log(`  "${k}": ${v.toFixed(2)}`);
}

//-- 2. EXECUTED from PAINEL --
const painelWb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const painelData = xlsx.utils.sheet_to_json(painelWb.Sheets[painelWb.SheetNames[0]], { defval: null });

// Fill-down all important columns
const FILL_DOWN = ['CONTA BANCARIA', 'ANO FAF', 'PROCESSO DE EXECUÇÃO Nº'];
const last = {};
for (const row of painelData) {
    for (const col of FILL_DOWN) {
        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
            last[col] = row[col];
        } else if (last[col] !== undefined) {
            row[col] = last[col];
        }
    }
}

const executed = {};
const seenOBs = new Set();

for (const row of painelData) {
    const obNum = (row['ORDEM BANCÁRIA Nº'] || '').toString().trim();
    const obVal = row[' VALOR DA ORDEM BANCÁRIA'];
    const rawConta = (row['CONTA BANCARIA'] || '').toString().trim().replace(/\s/g, '');

    // Skip if no OB number, no value, or already counted
    if (!obNum || typeof obVal !== 'number' || seenOBs.has(obNum)) continue;
    seenOBs.add(obNum);

    // Find matching conta
    const matched = Object.keys(CONTA_MAPPING).find(k => rawConta === k || rawConta.startsWith(k));
    if (matched) {
        const { instrumento, modalidade } = CONTA_MAPPING[matched];
        const key = `${instrumento}|${modalidade}`;
        executed[key] = (executed[key] || 0) + obVal;
    } else {
        console.log(`  UNMATCHED conta: "${rawConta}" for OB: ${obNum}`);
    }
}

console.log('\n=== EXECUTED KEYS (PAINEL OBs) ===');
for (const [k, v] of Object.entries(executed)) {
    console.log(`  "${k}": R$ ${v.toFixed(2)}`);
}

// Cross-check
console.log('\n=== CROSS-CHECK ===');
const allKeys = new Set([...Object.keys(authorized), ...Object.keys(executed)]);
for (const key of [...allKeys].sort()) {
    const aut = authorized[key] || 0;
    const exec = executed[key] || 0;
    const perc = aut > 0 ? ((exec / aut) * 100).toFixed(1) + '%' : '-';
    console.log(`  ${key}: Aut=${aut.toFixed(0)} Exec=${exec.toFixed(0)} ${perc}`);
}
