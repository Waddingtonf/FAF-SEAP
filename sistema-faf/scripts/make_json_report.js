const xlsx = require('xlsx');
const fs = require('fs');

const CONTA_MAPPING = {
    "11936-9": { "instrumento": "FAF 2016", "modalidade": "CAPITAL" },
    "11937-7": { "instrumento": "FAF 2016", "modalidade": "CUSTEIO" },
    "11935-0": { "instrumento": "FAF 2016", "modalidade": "OBRAS" },
    "11939-3": { "instrumento": "FAF 2017", "modalidade": "OBRAS + CAPITAL" },
    "11938-5": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-6": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-7": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-8": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-9": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-10": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-11": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-12": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11938-13": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO" },
    "11940-7": { "instrumento": "FAF 2018", "modalidade": "OBRAS + CAPITAL" },
    "11979-2": { "instrumento": "FAF 2019", "modalidade": "CAPITAL" },
    "11980-6": { "instrumento": "FAF 2019", "modalidade": "CUSTEIO" },
    "12392-7": { "instrumento": "FAF 2020", "modalidade": "CAPITAL" },
    "12633-0": { "instrumento": "FAF 2021", "modalidade": "CAPITAL" },
    "12634-9": { "instrumento": "FAF 2021", "modalidade": "CUSTEIO" },
    "12635-7": { "instrumento": "FAF 2021", "modalidade": "OBRAS" },
    "12942-9": { "instrumento": "FAF 2022", "modalidade": "CUSTEIO" },
    "12943-7": { "instrumento": "FAF 2022", "modalidade": "OBRAS" },
    "13259-4": { "instrumento": "FAF 2023", "modalidade": "OBRAS" },
    "13344-2": { "instrumento": "FAF 2023 Voluntário", "modalidade": "CUSTEIO" },
    "13670-0": { "instrumento": "FAF 2024", "modalidade": "OBRAS" },
    "14724-9": { "instrumento": "FAF 2025", "modalidade": "OBRAS" },
    "14723-0": { "instrumento": "FAF 2025", "modalidade": "CUSTEIO" },
    "15046-0": { "instrumento": "FAF 2025", "modalidade": "CAPITAL" }
};

const dadosWb = xlsx.readFile('../Dados FAF.xlsx');
const dadosData = xlsx.utils.sheet_to_json(dadosWb.Sheets[dadosWb.SheetNames[0]], { defval: null });

const authorized = {};
for (const row of dadosData) {
    let instr = (row['Instrumento'] || '').toString().trim();
    const ano = (row['Ano'] || '').toString().trim();
    const num = (row['nº'] || '').toString().trim();
    let nat = (row['Natureza de despesa'] || '').toString().trim().toUpperCase();

    let val = typeof row['Valor Global'] === 'number' ? row['Valor Global'] :
        (typeof row['Valor do repasse federal'] === 'number' ? row['Valor do repasse federal'] : 0);

    if (!instr || !ano || !nat || val === 0) continue;

    if (instr.toUpperCase() === 'FAF' && ano === '2023' && num === '47') instr = 'FAF 2023 Voluntário';
    else instr = `${instr} ${ano}`.trim();

    if (nat === 'OBRA') nat = 'OBRAS';
    if (nat === 'OBRA-CAPITAL' || nat === 'OBRA/CAPITAL') nat = 'OBRAS + CAPITAL';

    const key = `${instr}|${nat}`;
    authorized[key] = (authorized[key] || 0) + val;
}

const painelWb = xlsx.readFile('../PAINEL - FAF novo v2.xlsx');
const painelData = xlsx.utils.sheet_to_json(painelWb.Sheets[painelWb.SheetNames[0]], { defval: null });

const executed = {};
const unmapped = {};
let lastConta = '';
const seenOBs = new Set();

for (const row of painelData) {
    let rawConta = row['CONTA BANCARIA'];
    if (rawConta) lastConta = rawConta.toString().trim();

    const obNum = row['ORDEM BANCÁRIA Nº'];
    const obVal = row[' VALOR DA ORDEM BANCÁRIA'];

    if (!obNum || typeof obVal !== 'number' || obVal === 0) continue;

    const obKey = obNum.toString().trim();
    if (seenOBs.has(obKey)) continue;
    seenOBs.add(obKey);

    const conta = lastConta.replace(/[\s.]/g, '');
    const matchedConta = Object.keys(CONTA_MAPPING).find(k => conta === k.replace(/[\s.]/g, '') || conta.startsWith(k.replace(/[\s.]/g, '').split('-')[0]));

    if (matchedConta) {
        const { instrumento, modalidade } = CONTA_MAPPING[matchedConta];
        const key = `${instrumento}|${modalidade}`;
        executed[key] = (executed[key] || 0) + obVal;
    } else {
        unmapped[conta] = (unmapped[conta] || 0) + obVal;
    }
}

const report = {
    matches: {},
    unmapped: unmapped
};

const allKeys = new Set([...Object.keys(authorized), ...Object.keys(executed)]);
const sortedKeys = Array.from(allKeys).sort();

for (const key of sortedKeys) {
    const aut = authorized[key] || 0;
    const exe = executed[key] || 0;
    let status = "OK";
    if (aut > 0 && exe > aut) status = "EXCEEDS_BUDGET";
    if (aut === 0 && exe > 0) status = "UNAUTHORIZED_EXECUTION";
    if (aut > 0 && exe === 0) status = "NO_EXECUTION";

    report.matches[key] = { authorized: aut, executed: exe, status: status, percentage: aut > 0 ? ((exe / aut) * 100).toFixed(1) + '%' : '0%' };
}

fs.writeFileSync('C:/tmp/report.json', JSON.stringify(report, null, 2));
console.log('Report generated at C:/tmp/report.json');
