import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();
const painelPath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\PAINEL - FAF novo v2.xlsx');
const controlePath = path.resolve('C:\\Users\\l5857\\Downloads\\Gestao FAF\\Controle FAFs.xlsx');

const parseNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/[R$\s\.]/g, '').replace(',', '.'));
    return 0;
};

const INSTRUMENT_MAPPING: Record<string, { instrumento: string, modalidade: string, ano: number | null }> = {
    "11936-9": { "instrumento": "FAF 2016", "modalidade": "CAPITAL", ano: 2016 },
    "11937-7": { "instrumento": "FAF 2016", "modalidade": "CUSTEIO", ano: 2016 },
    "11935-0": { "instrumento": "FAF 2016", "modalidade": "OBRAS", ano: 2016 },
    "11939-3": { "instrumento": "FAF 2017", "modalidade": "OBRAS + CAPITAL", ano: 2017 },
    "11938-5": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-6": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-7": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-8": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-9": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-10": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-11": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-12": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11938-13": { "instrumento": "FAF 2017", "modalidade": "CUSTEIO", ano: 2017 },
    "11940-7": { "instrumento": "FAF 2018", "modalidade": "OBRAS + CAPITAL", ano: 2018 },
    "11979-2": { "instrumento": "FAF 2019", "modalidade": "CAPITAL", ano: 2019 },
    "11980-6": { "instrumento": "FAF 2019", "modalidade": "CUSTEIO", ano: 2019 },
    "12392-7": { "instrumento": "FAF 2020", "modalidade": "CAPITAL", ano: 2020 },
    "12633-0": { "instrumento": "FAF 2021", "modalidade": "CAPITAL", ano: 2021 },
    "12634-9": { "instrumento": "FAF 2021", "modalidade": "CUSTEIO", ano: 2021 },
    "12635-7": { "instrumento": "FAF 2021", "modalidade": "OBRAS", ano: 2021 },
    "12942-9": { "instrumento": "FAF 2022", "modalidade": "CUSTEIO", ano: 2022 },
    "12943-7": { "instrumento": "FAF 2022", "modalidade": "OBRAS", ano: 2022 },
    "13259-4": { "instrumento": "FAF 2023", "modalidade": "OBRAS", ano: 2023 },
    "13344-2": { "instrumento": "FAF 2023 Voluntário", "modalidade": "CUSTEIO", ano: 2023 },
    "13670-0": { "instrumento": "FAF 2024", "modalidade": "OBRAS", ano: 2024 },
    "14724-9": { "instrumento": "FAF 2025", "modalidade": "OBRAS", ano: 2025 },
    "14723-0": { "instrumento": "FAF 2025", "modalidade": "CUSTEIO", ano: 2025 },
    "15046-0": { "instrumento": "FAF 2025", "modalidade": "CAPITAL", ano: 2025 },
    "01000-6": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL", ano: null },
    "1000-6": { "instrumento": "FONTE 100", "modalidade": "RECURSO ORDINÁRIO ESTADUAL", ano: null }
};

async function main() {
    console.log('Iniciando script com mapeamento explícito de Instrumentos/Modalidades...');

    await prisma.tombamento.deleteMany();
    await prisma.ordemBancariaContrato.deleteMany();
    await prisma.ordemBancariaEmpenho.deleteMany();
    await prisma.ordemBancariaNotaFiscal.deleteMany();
    await prisma.ordemBancaria.deleteMany();
    await prisma.notaFiscalItem.deleteMany();
    await prisma.notaFiscal.deleteMany();
    await prisma.empenho.deleteMany();
    await prisma.contratoItem.deleteMany();
    await prisma.contrato.deleteMany();
    await prisma.processo.deleteMany();
    await prisma.planoAplicacaoDetalhado.deleteMany();
    await prisma.fafPlanoLdo.deleteMany();
    await prisma.contaBancaria.deleteMany();

    const controleWb = xlsx.readFile(controlePath);
    const painelWb = xlsx.readFile(painelPath);
    const painelSheet = painelWb.Sheets[painelWb.SheetNames[0]];
    const painelData = xlsx.utils.sheet_to_json<any>(painelSheet, { defval: null });

    console.log('Criando Contas Principais...');
    const contasMap = new Map<string, string>();

    for (const [numero_conta] of Object.entries(INSTRUMENT_MAPPING)) {
        const conta = await prisma.contaBancaria.upsert({
            where: { numero_conta },
            update: {},
            create: { numero_conta, descricao: `Conta Base` }
        });
        contasMap.set(numero_conta, conta.id);
    }

    // Fill down logic for merged cells in PAINEL (Controle FAFs)
    const fillDownColumns = [
        'ANO FAF', 'PROCESSO DE EXECUÇÃO Nº', 'FASE DE SELEÇÃO DO FORNECEDOR', 'MODALIDADE DE CONTRATAÇÃO',
        'CONTRATO Nº', 'ANO', 'SEI ID', ' VALOR UNITÁRIO CONTRATADO', ' VALOR TOTAL CONTRATADO',
        'DATA DA ASSINATURA', 'PRAZO DE ENTREGA (DIAS)', 'DATA LIMITE DE ENTREGA', 'GESTOR', 'FISCAL',
        'EMPENHO Nº', 'SEI ID_2', 'DATA DO EMPENHO', ' VALOR DO EMPENHO', 'CONTA BANCARIA'
    ];

    let lastRowValues: Record<string, any> = {};
    for (const row of painelData) {
        for (const col of fillDownColumns) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '-' && row[col] !== '') {
                lastRowValues[col] = row[col];
            } else if (lastRowValues[col] !== undefined) {
                row[col] = lastRowValues[col];
            }
        }
    }

    // Handle generic accounts from painel
    for (const row of painelData) {
        const contaName = row['CONTA BANCARIA']?.toString().split('-')[0]?.trim() || row['CONTA BANCARIA']?.toString().trim();
        let matchedConta = Object.keys(INSTRUMENT_MAPPING).find(k => row['CONTA BANCARIA']?.toString().includes(k));

        if (matchedConta) {
            row['_mappedConta'] = matchedConta;
        } else if (contaName && contaName !== '-' && contaName !== 'N/A' && !contasMap.has(contaName)) {
            const novaConta = await prisma.contaBancaria.create({
                data: { numero_conta: contaName, descricao: 'Desconhecida' }
            });
            contasMap.set(contaName, novaConta.id);
            row['_mappedConta'] = contaName;
        } else {
            row['_mappedConta'] = contaName;
        }
    }

    console.log('Criando Instrumentos (FAF e Modalidades)...');
    const fafMap = new Map<string, string>();
    for (const [numero_conta, info] of Object.entries(INSTRUMENT_MAPPING)) {
        const contaId = contasMap.get(numero_conta);
        const key = `${info.instrumento}-${contaId}`;
        if (contaId) {
            const faf = await prisma.fafPlanoLdo.create({
                data: {
                    instrumento: info.instrumento,
                    modalidade: info.modalidade,
                    ano: info.ano,
                    conta_bancaria_id: contaId,
                    valor_total: 0
                }
            });
            fafMap.set(key, faf.id);
        }
    }

    console.log('Lendo Planos de Aplicação Detalhado e Atualizando Totais...');
    const fafTotals = new Map<string, number>();
    for (const sheetName of controleWb.SheetNames) {
        if (sheetName.startsWith('20') && !sheetName.toLowerCase().includes('volunt')) {
            const cSheet = controleWb.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json<any>(cSheet, { defval: null });
            for (const row of data) {
                const rawConta = row['Conta']?.toString().trim();
                let matchedConta = Object.keys(INSTRUMENT_MAPPING).find(k => rawConta?.includes(k));
                if (matchedConta) {
                    const info = INSTRUMENT_MAPPING[matchedConta];
                    const contaId = contasMap.get(matchedConta);
                    const key = `${info.instrumento}-${contaId}`;
                    const fafId = fafMap.get(key);

                    if (fafId) {
                        const valor = parseNumber(row['Valor autorizado']);
                        fafTotals.set(fafId, (fafTotals.get(fafId) || 0) + valor);

                        await prisma.planoAplicacaoDetalhado.create({
                            data: {
                                faf_id: fafId,
                                natureza_despesa: row['Natureza de despesa']?.toString(),
                                segmento_eixo: row['Segmento/Eixo']?.toString(),
                                item_nome: row['Item']?.toString() || 'Item não especificado',
                                descricao: row['Descrição']?.toString(),
                                valor_autorizado: valor,
                                quantidade: parseNumber(row['Quantidade']),
                                unidade_medida: row['Unidade de medida']?.toString()
                            }
                        });
                    }
                }
            }
        }
    }

    for (const [fafId, total] of fafTotals.entries()) {
        await prisma.fafPlanoLdo.update({ where: { id: fafId }, data: { valor_total: total } });
    }

    console.log('Inserindo Processos, Contratos, Empenhos, NFs e OBs...');
    const processosCache = new Map<string, string>();
    const contratosCache = new Map<string, string>();

    for (const row of painelData) {
        const procNumero = row['PROCESSO DE EXECUÇÃO Nº']?.toString().trim();
        if (!procNumero || procNumero === '-' || procNumero.toLowerCase().includes('n/a')) continue;

        const matchedConta = row['_mappedConta'];
        if (!matchedConta) continue;
        const contaId = contasMap.get(matchedConta);
        if (!contaId) continue;

        let fafId: string | undefined = undefined;
        const mappedInfo = INSTRUMENT_MAPPING[matchedConta];
        if (mappedInfo) {
            fafId = fafMap.get(`${mappedInfo.instrumento}-${contaId}`);
        }

        if (!fafId) continue;

        let procId = processosCache.get(procNumero);
        if (!procId) {
            // Upsert para ignorar duplicatas do mesmo nª de processo
            const p = await prisma.processo.upsert({
                where: { numero_processo: procNumero },
                update: {},
                create: {
                    numero_processo: procNumero,
                    faf_id: fafId,
                    fornecedor: row['FASE DE SELEÇÃO DO FORNECEDOR']?.toString()
                }
            });
            procId = p.id;
            processosCache.set(procNumero, procId);
        }

        let contratoId: string | null = null;
        const numContrato = row['CONTRATO Nº']?.toString().trim();
        if (numContrato && numContrato !== '-') {
            contratoId = contratosCache.get(numContrato) || null;
            if (!contratoId) {
                const c = await prisma.contrato.create({
                    data: { numero_contrato: numContrato, processo_id: procId, valor_contrato: parseNumber(row[' VALOR TOTAL CONTRATADO']) }
                });
                contratoId = c.id;
                contratosCache.set(numContrato, contratoId);
            }
        }

        const numEmpenho = row['EMPENHO Nº']?.toString().trim();
        let empenhoId: string | null = null;
        if (numEmpenho && numEmpenho !== '-') {
            const e = await prisma.empenho.create({
                data: { numero_empenho: numEmpenho, processo_id: procId, valor_empenho: parseNumber(row[' VALOR DO EMPENHO']) }
            });
            empenhoId = e.id;
        }

        const numNF = row['NOTA FISCAL Nº']?.toString().trim();
        let nfId: string | null = null;
        if (numNF && numNF !== '-' && contratoId) {
            const nf = await prisma.notaFiscal.create({
                data: { numero_nf: numNF, contrato_id: contratoId, valor_total: parseNumber(row[' NOTA FISCAL VALOR TOTAL']) }
            });
            nfId = nf.id;
        }

        const numOB = row['ORDEM BANCÁRIA Nº']?.toString().trim();
        if (numOB && numOB !== '-') {
            const ob = await prisma.ordemBancaria.create({
                data: { numero_ob: numOB, valor_ob: parseNumber(row[' VALOR DA ORDEM BANCÁRIA']) }
            });

            if (nfId) await prisma.ordemBancariaNotaFiscal.create({ data: { ob_id: ob.id, nf_id: nfId, valor_pago_nesta_ob: ob.valor_ob } });
            if (empenhoId) await prisma.ordemBancariaEmpenho.create({ data: { ob_id: ob.id, empenho_id: empenhoId, valor_abatido_nesta_ob: ob.valor_ob } });
            if (contratoId) await prisma.ordemBancariaContrato.create({ data: { ob_id: ob.id, contrato_id: contratoId, valor_pago: ob.valor_ob } });
        }
    }

    console.log('Migração com Mapeamento Exato finalizada!');
}

main().catch(e => { console.error('Erro:', e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
