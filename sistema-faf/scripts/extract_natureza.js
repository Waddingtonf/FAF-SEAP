const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('../Controle FAFs.xlsx');
const mapping = {};

for (const sheetName of wb.SheetNames) {
    if (!sheetName.startsWith('20')) continue;
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    for (const row of data) {
        const rawConta = row['Conta'];
        const nat = row['Natureza de despesa'];
        if (rawConta && nat) {
            const contaStr = rawConta.toString().trim().replace(/[.\s]/g, '');
            let modalidade = nat.toString().trim().toUpperCase();
            if (modalidade === 'OBRA') modalidade = 'OBRAS';
            if (modalidade === 'OBRA-CAPITAL' || modalidade === 'OBRA/CAPITAL') modalidade = 'OBRAS + CAPITAL';

            const key = `${contaStr}`;
            if (!mapping[key]) {
                mapping[key] = {
                    instrumento: `FAF ${sheetName.trim().replace('voluntário', 'Voluntário')}`,
                    modalidade: modalidade
                };
            }
        }
    }
}
fs.writeFileSync('C:/tmp/mapa_contas.json', JSON.stringify(mapping, null, 2));
