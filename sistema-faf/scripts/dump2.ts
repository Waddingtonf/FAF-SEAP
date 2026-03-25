import * as xlsx from 'xlsx';
import path from 'path';

const painelPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\PAINEL - FAF novo v2.xlsx');

async function dump2017() {
    const wb = xlsx.readFile(painelPath);
    const rows = xlsx.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: null });
    
    console.log('--- Analisando Processos e OBs da Conta 11939-3 (FAF 2017) ---');
    let count = 0;
    for (const row of rows) {
        const conta = row['CONTA BANCARIA']?.toString() || '';
        if (conta.includes('11939-3')) {
            console.log(`Processo: ${row['PROCESSO DE EXECUÇÃO Nº']}, OB: ${row['ORDEM BANCÁRIA Nº']}, Valor OB: ${row[' VALOR DA ORDEM BANCÁRIA']}`);
            count++;
            if (count > 20) break;
        }
    }
}

dump2017();
