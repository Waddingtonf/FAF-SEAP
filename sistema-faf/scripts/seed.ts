import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Paths to Excel files
const painelPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\PAINEL - FAF novo v2.xlsx');
const controlePath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\Controle FAFs.xlsx');
const dadosFafPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\Dados FAF.xlsx');

const parseNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/[R$\s\.]/g, '').replace(',', '.'));
    return 0;
};

const parseDate = (val: any) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        // Excel date serial number
        return new Date((val - 25569) * 86400 * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// Normalize account: remove dots, spaces, dashes and trailing chars
const normalizeConta = (c: string) => c.replace(/[\s\.\-]/g, '').trim();

const INSTRUMENT_MAPPING: Record<string, { instrumento: string, modalidade: string, ano: number | null }> = {
    "119369": { "instrumento": "FAF 2016", "modalidade": "CAPITAL", ano: 2016 },
    "119377": { "instrumento": "FAF 2016", "modalidade": "CUSTEIO", ano: 2016 },
    "119350": { "instrumento": "FAF 2016", "modalidade": "OBRAS", ano: 2016 },
    "119393": { "instrumento": "FAF 2017", "modalidade": "OBRAS + CAPITAL", ano: 2017 },
    "119385": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "119386": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "119387": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "119388": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "119389": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "1193810": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "1193811": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "1193812": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "1193813": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "119407": { "instrumento": "FAF 2018", "modalidade": "OBRAS + CAPITAL", ano: 2018 },
    "119792": { "instrumento": "FAF 2019", "modalidade": "CAPITAL", ano: 2019 },
    "119806": { "instrumento": "FAF 2019", "modalidade": "CUSTEIO", ano: 2019 },
    "123927": { "instrumento": "FAF 2020", "modalidade": "CAPITAL", ano: 2020 },
    "126330": { "instrumento": "FAF 2021", "modalidade": "CAPITAL", ano: 2021 },
    "126349": { "instrumento": "FAF 2021", "modalidade": "CUSTEIO", ano: 2021 },
    "126357": { "instrumento": "FAF 2021", "modalidade": "OBRAS", ano: 2021 },
    "129429": { "instrumento": "FAF 2022", "modalidade": "CUSTEIO", ano: 2022 },
    "129437": { "instrumento": "FAF 2022", "modalidade": "OBRAS", ano: 2022 },
    "132594": { "instrumento": "FAF 2023", "modalidade": "OBRAS", ano: 2023 },
    "133442": { "instrumento": "FAF 2023 Voluntário", "modalidade": "CUSTEIO", ano: 2023 },
    "136700": { "instrumento": "FAF 2024", "modalidade": "OBRAS", ano: 2024 },
    "147249": { "instrumento": "FAF 2025", "modalidade": "OBRAS", ano: 2025 },
    "147230": { "instrumento": "FAF 2025", "modalidade": "CUSTEIO", ano: 2025 },
    "150460": { "instrumento": "FAF 2025", "modalidade": "CAPITAL", ano: 2025 },
    "010006": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL", ano: null },
    "10006": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL", ano: null }
};

async function main() {
    console.log('--- Sincronização de Dados V3 (Total por Conta) ---');

    await prisma.$transaction([
        prisma.ordemBancariaNotaFiscal.deleteMany(),
        prisma.ordemBancariaEmpenho.deleteMany(),
        prisma.ordemBancariaContrato.deleteMany(),
        prisma.tombamento.deleteMany(),
        prisma.notaFiscalItem.deleteMany(),
        prisma.notaFiscal.deleteMany(),
        prisma.empenho.deleteMany(),
        prisma.contratoItem.deleteMany(),
        prisma.contrato.deleteMany(),
        prisma.processo.deleteMany(),
        prisma.planoAplicacaoDetalhado.deleteMany(),
        prisma.fafPlanoLdo.deleteMany(),
        prisma.contaBancaria.deleteMany(),
    ]);

    // 1. Totais Autorizados (Dados FAF.xlsx)
    const authorizedData: Record<string, number> = {};
    if (fs.existsSync(dadosFafPath)) {
        const rows = xlsx.utils.sheet_to_json<any>(xlsx.readFile(dadosFafPath).Sheets[xlsx.readFile(dadosFafPath).SheetNames[0]], { defval: null });
        for (const row of rows) {
            let instr = (row['Instrumento'] ?? '').toString().trim();
            const ano = (row['Ano'] ?? '').toString().trim();
            const num = (row['nº'] ?? '').toString().trim();
            let nat = (row['Natureza de despesa'] ?? '').toString().trim().toUpperCase();
            const val = typeof row['Valor Global'] === 'number' ? row['Valor Global'] : 0;
            if (!instr || !ano || val === 0) continue;
            if (instr.toUpperCase() === 'FAF' && ano === '2023' && num === '47') instr = 'FAF 2023 Voluntário';
            else instr = `${instr} ${ano}`.trim();
            if (nat === 'OBRA') nat = 'OBRAS';
            if (nat === 'OBRA-CAPITAL' || nat === 'OBRA/CAPITAL') nat = 'OBRAS + CAPITAL';
            const key = `${instr}|${nat}`;
            authorizedData[key] = (authorizedData[key] ?? 0) + val;
        }
    }

    // 2. Contas e Instrumentos
    const contasCache = new Map<string, string>();
    const fafMap = new Map<string, string>();
    const fafExecTotal = new Map<string, number>();

    for (const [rawNum, info] of Object.entries(INSTRUMENT_MAPPING)) {
        const normNum = normalizeConta(rawNum);
        let contaId = contasCache.get(normNum);
        if (!contaId) {
            const conta = await prisma.contaBancaria.create({ data: { numero_conta: normNum, descricao: `Conta ${info.instrumento}` } });
            contaId = conta.id;
            contasCache.set(normNum, contaId);
        }
        const authKey = `${info.instrumento}|${info.modalidade}`;
        const faf = await prisma.fafPlanoLdo.create({
            data: {
                instrumento: info.instrumento,
                modalidade: info.modalidade,
                ano: info.ano,
                conta_bancaria_id: contaId,
                valor_autorizado_total: authorizedData[authKey] || 0
            }
        });
        fafMap.set(`${info.instrumento}-${info.modalidade}-${normNum}`, faf.id);
        fafExecTotal.set(faf.id, 0);
    }

    // 3. Execução (Painel)
    if (fs.existsSync(painelPath)) {
        const painelData = xlsx.utils.sheet_to_json<any>(xlsx.readFile(painelPath).Sheets[xlsx.readFile(painelPath).SheetNames[0]], { defval: null });
        
        const processesCache = new Map<string, string>();
        const contratosCache = new Map<string, string>();
        const empenhosCache = new Map<string, string>();
        const obsCache = new Map<string, string>();
        const fafObsVistas = new Map<string, Set<string>>();

        let lastProc = '', lastForn = '', lastContrato = '', lastValContrato = 0, lastAssinatura: any = null, lastEmpenho = '', lastDataEmpenho: any = null, lastValEmpenho = 0, lastConta = '';

        for (const row of painelData) {
            if (row['PROCESSO DE EXECUÇÃO Nº'] && row['PROCESSO DE EXECUÇÃO Nº'] !== '-') lastProc = row['PROCESSO DE EXECUÇÃO Nº'].toString().trim();
            if (row['FASE DE SELEÇÃO DO FORNECEDOR'] && row['FASE DE SELEÇÃO DO FORNECEDOR'] !== '-') lastForn = row['FASE DE SELEÇÃO DO FORNECEDOR'].toString().trim();
            if (row['CONTRATO Nº'] && row['CONTRATO Nº'] !== '-') lastContrato = row['CONTRATO Nº'].toString().trim();
            if (row[' VALOR TOTAL CONTRATADO']) lastValContrato = parseNumber(row[' VALOR TOTAL CONTRATADO']);
            if (row['DATA DA ASSINATURA']) lastAssinatura = parseDate(row['DATA DA ASSINATURA']);
            if (row['EMPENHO Nº'] && row['EMPENHO Nº'] !== '-') lastEmpenho = row['EMPENHO Nº'].toString().trim();
            if (row['DATA DO EMPENHO']) lastDataEmpenho = parseDate(row['DATA DO EMPENHO']);
            if (row[' VALOR DO EMPENHO']) lastValEmpenho = parseNumber(row[' VALOR DO EMPENHO']);
            if (row['CONTA BANCARIA'] && row['CONTA BANCARIA'] !== '-') lastConta = row['CONTA BANCARIA'].toString().trim();

            if (!lastConta) continue;
            const normConta = normalizeConta(lastConta);
            const mapping = INSTRUMENT_MAPPING[normConta];
            if (!mapping) continue;
            const fafId = fafMap.get(`${mapping.instrumento}-${mapping.modalidade}-${normConta}`);
            if (!fafId) continue;

            // Somar valor da OB ao total do FAF de forma única
            const numOB = row['ORDEM BANCÁRIA Nº']?.toString().trim();
            const valOB = parseNumber(row[' VALOR DA ORDEM BANCÁRIA']);
            if (numOB && numOB !== '-' && valOB > 0) {
                if (!fafObsVistas.has(fafId)) fafObsVistas.set(fafId, new Set());
                if (!fafObsVistas.get(fafId)?.has(numOB)) {
                    fafObsVistas.get(fafId)?.add(numOB);
                    fafExecTotal.set(fafId, (fafExecTotal.get(fafId) || 0) + valOB);
                }

                // Salvar OB no banco
                let obId = obsCache.get(numOB);
                if (!obId) {
                    const ob = await prisma.ordemBancaria.upsert({
                        where: { numero_ob: numOB },
                        update: {},
                        create: { numero_ob: numOB, valor_ob: valOB, data_pagamento: parseDate(row['DATA DO PAGAMENTO']) }
                    });
                    obId = ob.id;
                    obsCache.set(numOB, obId);
                }

                // Se houver processo, criar vínculos
                if (lastProc && lastProc !== '-') {
                    let pId = processesCache.get(lastProc);
                    if (!pId) {
                        const p = await prisma.processo.create({ data: { numero_processo: lastProc, faf_id: fafId, fornecedor: lastForn, status: 'EM_ANDAMENTO' } });
                        pId = p.id;
                        processesCache.set(lastProc, pId);
                    }
                    let cId: string | null = null;
                    if (lastContrato && lastContrato !== '-') {
                        cId = contratosCache.get(lastContrato);
                        if (!cId) {
                            const c = await prisma.contrato.create({ data: { numero_contrato: lastContrato, processo_id: pId, valor_contrato: lastValContrato, data_assinatura: lastAssinatura, status: 'ATIVO' } });
                            cId = c.id;
                            contratosCache.set(lastContrato, cId);
                        }
                    }
                    let eId: string | null = null;
                    if (lastEmpenho && lastEmpenho !== '-') {
                        eId = empenhosCache.get(lastEmpenho);
                        if (!eId) {
                            const e = await prisma.empenho.create({ data: { numero_empenho: lastEmpenho, processo_id: pId, contrato_id: cId, valor_empenho: lastValEmpenho, data_empenho: lastDataEmpenho, status: 'EMITIDO' } });
                            eId = e.id;
                            empenhosCache.set(lastEmpenho, eId);
                        }
                    }
                    if (cId) await prisma.ordemBancariaContrato.upsert({ where: { ob_id_contrato_id: { ob_id: obId, contrato_id: cId } }, update: {}, create: { ob_id: obId, contrato_id: cId, valor_pago: valOB } });
                    if (eId) await prisma.ordemBancariaEmpenho.upsert({ where: { ob_id_empenho_id: { ob_id: obId, empenho_id: eId } }, update: {}, create: { ob_id: obId, empenho_id: eId, valor_abatido_nesta_ob: valOB } });
                }
            }
        }
    }

    // 4. Update Final Totals
    console.log('Gravando totais atualizados...');
    for (const [fafId, total] of fafExecTotal.entries()) {
        await prisma.fafPlanoLdo.update({ where: { id: fafId }, data: { valor_total: total } });
    }

    console.log('--- Sincronização Finalizada! ---');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
