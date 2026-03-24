import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface FafAggregate {
    instrumento: string;
    modalidade: string;
    valorAutorizado: number;
}

export function getExcelAggregates(): Record<string, number> {
    const tmpPath = path.join(os.tmpdir(), 'Dados_FAF_temp.xlsx');
    try {
        const filePath = 'C:/Users/l5857/Downloads/Gestao FAF/Dados FAF.xlsx';

        // Use copy to bypass Windows EBUSY locks if Excel is open
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, tmpPath);
        }

        const wb = xlsx.readFile(tmpPath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        const aggregates: Record<string, number> = {};

        data.forEach((row: any) => {
            const instr = row['Instrumento'] || '';
            const ano = row['Ano'] || '';
            const natureza = row['Natureza de despesa'] || '';
            const valorFederal = row['Valor do repasse federal'] || 0;

            // Normalization logic to match DB keys
            // Excel: "Obra", "Capital", "Custeio", "Obra-Capital"
            // DB: "OBRAS", "CAPITAL", "CUSTEIO", "OBRAS + CAPITAL"
            let modalidade = natureza.toUpperCase();
            if (modalidade === 'OBRA') modalidade = 'OBRAS';
            if (modalidade === 'OBRA-CAPITAL') modalidade = 'OBRAS + CAPITAL';

            const instrumentFull = `${instr} ${ano}`.trim();
            const key = `${instrumentFull}|${modalidade}`;

            if (!aggregates[key]) aggregates[key] = 0;
            aggregates[key] += valorFederal;
        });

        return aggregates;
    } catch (error) {
        console.error("Erro ao ler Dados FAF.xlsx:", error);
        return {};
    }
}
