import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProcessoDetalhesPage({
    params,
}: {
    params: Promise<{ id: string }> | { id: string };
}) {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const processo = await prisma.processo.findUnique({
        where: { id },
        include: {
            faf: {
                include: { conta_bancaria: true }
            },
            contratos: {
                include: {
                    notas_fiscais: {
                        orderBy: { data_emissao: 'desc' }
                    }
                },
                orderBy: { numero_contrato: 'asc' }
            },
            empenhos: {
                orderBy: { data_empenho: 'desc' }
            }
        }
    });

    if (!processo) return notFound();

    // Aggregate all unique OBs for this Processo using OR logic
    const ordensRelacionadas = await prisma.ordemBancaria.findMany({
        where: {
            OR: [
                { empenhos: { some: { empenho: { processo_id: id } } } },
                { notas_fiscais: { some: { nf: { contrato: { processo_id: id } } } } },
                { contratos: { some: { contrato: { processo_id: id } } } }
            ]
        },
        orderBy: { data_pagamento: 'desc' }
    });

    // Flat list of NFs across all Contracts for simple rendering
    const todasNotasFiscais = processo.contratos.flatMap(c =>
        c.notas_fiscais.map(nf => ({ ...nf, contrato_num: c.numero_contrato }))
    ).sort((a, b) => {
        return new Date(b.data_emissao || 0).getTime() - new Date(a.data_emissao || 0).getTime();
    });

    const totalEmpenhado = processo.empenhos.reduce((acc, curr) => acc + curr.valor_empenho, 0);
    const totalContratos = processo.contratos.reduce((acc, curr) => acc + curr.valor_contrato, 0);
    const totalNotasFiscais = todasNotasFiscais.reduce((acc, curr) => acc + curr.valor_total, 0);
    const totalPago = ordensRelacionadas.reduce((acc, curr) => acc + curr.valor_ob, 0);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/processos" />

            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <Link href="/processos" className="text-xs font-bold text-slate-500 hover:text-amber-600 mb-4 inline-flex items-center uppercase tracking-widest transition-colors">
                                &larr; Voltar para Processos
                            </Link>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Processo <span className="font-mono text-amber-600 bg-amber-50 px-2 rounded">{processo.numero_processo}</span></h2>
                            <div className="mt-4 flex flex-wrap gap-y-2 gap-x-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-2">
                                    <span className="text-slate-400">Fornecedor:</span>
                                    <span className="text-slate-900">{processo.fornecedor || 'NÃO INFORMADO'}</span>
                                </span>
                                <span className="text-slate-200">|</span>
                                <span className="flex items-center gap-2">
                                    <span className="text-slate-400">Instrumento:</span>
                                    <span className="text-slate-900">{processo.faf.instrumento} ({processo.faf.modalidade})</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Contratos</h3>
                            <p className="text-xl font-bold text-slate-900 font-mono">R$ {totalContratos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Empenhado</h3>
                            <p className="text-xl font-bold text-slate-900 font-mono">R$ {totalEmpenhado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">NF Emitidas</h3>
                            <p className="text-xl font-bold text-slate-900 font-mono">R$ {totalNotasFiscais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-md">
                            <h3 className="text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.2em] mb-1">Total Pago (OB)</h3>
                            <p className="text-xl font-bold text-amber-500 font-mono">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        <div className="space-y-8">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Contratos Vinculados</h4>
                                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{processo.contratos.length}</span>
                                </div>
                                <div className="p-0">
                                    {processo.contratos.length > 0 ? (
                                        <ul className="divide-y divide-slate-100">
                                            {processo.contratos.map(ct => (
                                                <li key={ct.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-bold text-slate-900">CT {ct.numero_contrato}</p>
                                                        <p className="text-sm font-bold text-slate-900 font-mono">R$ {ct.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    </div>
                                                    {ct.objeto && <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">{ct.objeto}</p>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum contrato associado.</p>}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Empenhos Emitidos</h4>
                                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{processo.empenhos.length}</span>
                                </div>
                                <div className="p-0">
                                    {processo.empenhos.length > 0 ? (
                                        <ul className="divide-y divide-slate-100">
                                            {processo.empenhos.map(emp => (
                                                <li key={emp.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                                    <div>
                                                        <p className="font-mono text-slate-900 font-bold">{emp.numero_empenho}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{new Date(emp.data_empenho || 0).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                    <p className="font-bold text-slate-900 font-mono">R$ {emp.valor_empenho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum empenho associado.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Notas Fiscais (NFs)</h4>
                                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{todasNotasFiscais.length}</span>
                                </div>
                                <div className="p-0">
                                    {todasNotasFiscais.length > 0 ? (
                                        <ul className="divide-y divide-slate-100">
                                            {todasNotasFiscais.map(nf => (
                                                <li key={nf.id} className="p-5 flex justify-between items-start hover:bg-slate-50/50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-slate-900 underline decoration-slate-200 underline-offset-4">NF {nf.numero_nf}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">
                                                            Ref. CT: <span className="text-slate-600">{nf.contrato_num}</span> • {new Date(nf.data_emissao || 0).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <p className="font-bold text-slate-900 font-mono text-sm">R$ {nf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma nota fiscal associada.</p>}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md">
                                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Ordens Bancárias (OB)</h4>
                                    <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">{ordensRelacionadas.length}</span>
                                </div>
                                <div className="p-0">
                                    {ordensRelacionadas.length > 0 ? (
                                        <ul className="divide-y divide-slate-800">
                                            {ordensRelacionadas.map(ob => (
                                                <li key={ob.id} className="p-5 flex justify-between items-center hover:bg-slate-800 transition-colors">
                                                    <div>
                                                        <p className="font-mono text-amber-500 font-bold">{ob.numero_ob}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Pagamento: {new Date(ob.data_pagamento || 0).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                    <p className="font-bold text-amber-500 font-mono">R$ {ob.valor_ob.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="p-8 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">Nenhuma OB efetuada ainda.</p>}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
