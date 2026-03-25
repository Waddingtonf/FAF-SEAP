import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('--- Iniciando Diagnóstico de Discrepâncias ---');

    const fafs = await prisma.fafPlanoLdo.findMany({
        include: {
            conta_bancaria: true,
            processos: {
                include: {
                    contratos: { include: { ordens_bancarias: { include: { ob: true } } } },
                    empenhos: { include: { ordens_bancarias: { include: { ob: true } } } }
                }
            }
        }
    });

    for (const faf of fafs) {
        const diff = faf.valor_total - faf.valor_autorizado_total;
        
        // Critério: Executado maior que Autorizado (com margem de R$ 1 para arredondamentos)
        if (diff > 1) {
            console.log(`\n⚠️ DISCREPÂNCIA DETECTADA: ${faf.instrumento} (${faf.modalidade})`);
            console.log(`   Conta: ${faf.conta_bancaria.numero_conta}`);
            console.log(`   Autorizado: R$ ${faf.valor_autorizado_total.toLocaleString('pt-BR')}`);
            console.log(`   Executado:  R$ ${faf.valor_total.toLocaleString('pt-BR')}`);
            console.log(`   Excesso:    R$ ${diff.toLocaleString('pt-BR')}`);

            // Analisar OBs únicas vinculadas a este FAF
            const obsSet = new Map<string, number>();
            faf.processos.forEach(p => {
                p.contratos.forEach(c => c.ordens_bancarias.forEach(o => obsSet.set(o.ob.numero_ob, o.ob.valor_ob)));
                p.empenhos.forEach(e => e.ordens_bancarias.forEach(o => obsSet.set(o.ob.numero_ob, o.ob.valor_ob)));
            });

            console.log(`   Total de OBs únicas vinculadas: ${obsSet.size}`);
            const sumObs = Array.from(obsSet.values()).reduce((a, b) => a + b, 0);
            console.log(`   Soma real das OBs únicas: R$ ${sumObs.toLocaleString('pt-BR')}`);

            if (sumObs !== faf.valor_total) {
                console.log(`   ❌ ERRO DE CÁLCULO: A soma no banco (${faf.valor_total}) difere da soma real das OBs únicas (${sumObs})`);
            }
        }
    }

    console.log('\n--- Fim do Diagnóstico ---');
}

diagnose().finally(() => prisma.$disconnect());
