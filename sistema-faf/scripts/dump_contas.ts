import * as xlsx from 'xlsx';
import path from 'path';

const painelPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\PAINEL - FAF novo v2.xlsx');

async function checkContas() {
    const painelWb = xlsx.readFile(painelPath);
    const painelData = xlsx.utils.sheet_to_json<any>(painelWb.Sheets[painelWb.SheetNames[0]], { defval: null });
    
    const uniqueContas = new Set<string>();
    painelData.forEach(row => {
        if (row['CONTA BANCARIA']) uniqueContas.add(row['CONTA BANCARIA'].toString());
    });
    
    console.log('Contas encontradas no Excel:');
    Array.from(uniqueContas).sort().forEach(c => console.log(`"${c}"`));
}

checkContas();
