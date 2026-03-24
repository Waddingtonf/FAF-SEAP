import * as xlsx from 'xlsx';
import fs from 'fs';

// Mapping: conta bancaria number → {instrumento, modalidade}
// Extracted automatically from "Controle FAFs.xlsx"
const CONTA_MAPPING: Record<string, { instrumento: string; modalidade: string }> = {
    "11936-9": { "instrumento": "FAF 2016", "modalidade": "CAPITAL" },
    "11937-7": { "instrumento": "FAF 2016", "modalidade": "CUSTEIO" },
    "11935-0": { "instrumento": "FAF 2016", "modalidade": "OBRAS" },
    "11939-3": { "instrumento": "FAF 2017", "modalidade": "CAPITAL" }, // Actually OBRAS+CAPITAL, adapting below
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
    "15046-0": { "instrumento": "FAF 2025", "modalidade": "CAPITAL" },
    "01000-6": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL" },
    "1000-6": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL" }
};
// Fix 2017 Capital map which is actually Obras + Capital 
CONTA_MAPPING['11939-3'].modalidade = 'OBRAS + CAPITAL';


function readExcelRows(filePath: string): any[] {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`Excel não encontrado: ${filePath}`);
            return [];
        }
        // Read raw bytes into buffer — works even when Windows has the file locked (Excel open).
        const buf = fs.readFileSync(filePath);
        const wb = xlsx.read(buf, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        return xlsx.utils.sheet_to_json<any>(sheet, { defval: null });
    } catch (err) {
        console.error(`Erro ao ler ${filePath}:`, err);
    }
    return [];
}

/**
 * Reads Dados FAF.xlsx and returns authorized totals keyed as "instrumento|modalidade".
 * Example key: "FAF 2016|OBRAS"
 */
export function getAuthorizedTotals(): Record<string, number> {
    const filePath = 'C:/Users/l5857/Downloads/Gestao FAF/Dados FAF.xlsx';
    const rows = readExcelRows(filePath);
    const result: Record<string, number> = {};

    for (const row of rows) {
        let instr = (row['Instrumento'] ?? '').toString().trim();
        const ano = (row['Ano'] ?? '').toString().trim();
        const num = (row['nº'] ?? '').toString().trim();
        let nat = (row['Natureza de despesa'] ?? '').toString().trim().toUpperCase();

        // As requested by user, use Valor Global instead of Valor do Repasse for correct values
        const val = typeof row['Valor Global'] === 'number' ? row['Valor Global'] :
            (typeof row['Valor do repasse federal'] === 'number' ? row['Valor do repasse federal'] : 0);

        if (!instr || !ano || !nat || val === 0) continue;

        // FAF 2023 Voluntário is number 47
        if (instr.toUpperCase() === 'FAF' && ano === '2023' && num === '47') {
            instr = 'FAF 2023 Voluntário';
        } else {
            instr = `${instr} ${ano}`.trim();
        }

        // Normalize nature names to match DB modalidade values
        if (nat === 'OBRA') nat = 'OBRAS';
        if (nat === 'OBRA-CAPITAL' || nat === 'OBRA/CAPITAL') nat = 'OBRAS + CAPITAL';

        const key = `${instr}|${nat}`;
        result[key] = (result[key] ?? 0) + val;
    }
    return result;
}

/**
 * Reads PAINEL - FAF novo v2.xlsx and returns executed totals (sum of unique OBs)
 * keyed as "instrumento|modalidade", looking up the conta bancaria to find the instrument.
 * Example key: "FAF 2016|OBRAS"
 */
export function getExecutedTotals(): Record<string, number> {
    const filePath = 'C:/Users/l5857/Downloads/Gestao FAF/PAINEL - FAF novo v2.xlsx';
    const rows = readExcelRows(filePath);
    const result: Record<string, number> = {};

    // Fill-down context variables
    let lastConta: string = '';
    const seenOBs = new Set<string>();

    for (const row of rows) {
        // Track most recent conta bancaria (fill-down)
        const rawConta = row['CONTA BANCARIA'];
        if (rawConta !== null && rawConta !== undefined && rawConta !== '') {
            lastConta = rawConta.toString().trim();
        }

        const obNum = row['ORDEM BANCÁRIA Nº'];
        const obVal = row[' VALOR DA ORDEM BANCÁRIA'];

        // Only process rows with an OB number and a real numeric value
        if (!obNum || typeof obVal !== 'number' || obVal === 0) continue;

        const obKey = obNum.toString().trim();
        // Skip duplicates (OBs repeated across multiple NF rows)
        if (seenOBs.has(obKey)) continue;
        seenOBs.add(obKey);

        // Normalize conta number (remove spaces, dots) and find instrument mapping
        const conta = lastConta.replace(/[\s.]/g, '');
        const matchedConta = Object.keys(CONTA_MAPPING).find(k => conta === k.replace(/[\s.]/g, '') || conta.startsWith(k.replace(/[\s.]/g, '').split('-')[0]));

        if (matchedConta) {
            const { instrumento, modalidade } = CONTA_MAPPING[matchedConta];
            const key = `${instrumento}|${modalidade}`;
            result[key] = (result[key] ?? 0) + obVal;
        }
    }
    return result;
}

// Legacy alias for backward compatibility
export { getAuthorizedTotals as getExcelAggregates };
