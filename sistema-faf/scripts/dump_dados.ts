import * as xlsx from 'xlsx';
import path from 'path';

const dadosFafPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\Dados FAF.xlsx');

async function checkDados() {
    const wb = xlsx.readFile(dadosFafPath);
    const rows = xlsx.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: null });
    
    console.log('--- Verificando Dados FAF (Autorizado) ---');
    const summary: any = {};
    
    for (const row of rows) {
        let instr = (row['Instrumento'] ?? '').toString().trim();
        const ano = (row['Ano'] ?? '').toString().trim();
        const num = (row['nº'] ?? '').toString().trim();
        let nat = (row['Natureza de despesa'] ?? '').toString().trim().toUpperCase();
        const val = typeof row['Valor Global'] === 'number' ? row['Valor Global'] : 0;

        if (!instr || !ano || val === 0) continue;

        if (instr.toUpperCase() === 'FAF' && ano === '2023' && num === '47') {
            instr = 'FAF 2023 Voluntário';
        } else {
            instr = `${instr} ${ano}`.trim();
        }

        if (nat === 'OBRA') nat = 'OBRAS';
        if (nat === 'OBRA-CAPITAL' || nat === 'OBRA/CAPITAL') nat = 'OBRAS + CAPITAL';

        const key = `${instr}|${nat}`;
        summary[key] = (summary[key] || 0) + val;
    }
    
    Object.entries(summary).sort().forEach(([k, v]) => {
        console.log(`${k.padEnd(35)}: R$ ${Number(v).toLocaleString('pt-BR')}`);
    });
}

checkDados();
