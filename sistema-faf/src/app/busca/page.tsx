import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SearchForm } from '@/components/SearchForm';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function BuscaPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }> | { q?: string };
}) {
    const resolvedSearchParams = await Promise.resolve(searchParams);
    const q = (resolvedSearchParams.q || '').trim();

    let processos: any[] = [];
    let contratos: any[] = [];
    let empenhos: any[] = [];
    let notasFiscais: any[] = [];
    let ordensBancarias: any[] = [];

    if (q) {
        processos = await prisma.processo.findMany({
            where: { numero_processo: { contains: q } },
            include: { faf: true }
        });

        contratos = await prisma.contrato.findMany({
            where: {
                OR: [
                    { numero_contrato: { contains: q } },
                    { fornecedor: { contains: q } },
                    { objeto: { contains: q } }
                ]
            },
            include: { processo: true }
        });

        empenhos = await prisma.empenho.findMany({
            where: { numero_empenho: { contains: q } },
            include: { processo: true }
        });

        notasFiscais = await prisma.notaFiscal.findMany({
            where: { numero_nf: { contains: q } },
            include: {
                contrato: {
                    include: { processo: true }
                }
            }
        });

        ordensBancarias = await prisma.ordemBancaria.findMany({
            where: { numero_ob: { contains: q } }
        });
    }

    const totalResults = processos.length + contratos.length + empenhos.length + notasFiscais.length + ordensBancarias.length;

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/busca" />

            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Busca Global</h2>
                        <p className="text-slate-500 text-sm mt-1">Pesquise em todo o ecossistema FAF (Processos, Contratos, Empenhos, NFs e OBs)</p>
                    </div>

                    <SearchForm initialQuery={q} />

                    {q ? (
                        <div className="space-y-10 mt-8">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                <h3 className="text-xl font-medium text-slate-600">Resultados para: <span className="font-bold text-slate-900">"{q}"</span></h3>
                                <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{totalResults} encontrados</span>
                            </div>

                            {/* Processos */}
                            {processos.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Processos SEI
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {processos.map(p => (
                                            <Link key={p.id} href={`/processos/${p.id}`} className="block bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-amber-400 transition-colors group">
                                                <p className="text-lg font-bold text-slate-900 font-mono group-hover:text-amber-600">{p.numero_processo}</p>
                                                <p className="text-xs text-slate-500 font-medium uppercase mt-2">{p.faf.instrumento} &bull; {p.faf.modalidade}</p>
                                                <p className="text-xs text-slate-400 mt-1 truncate">{p.fornecedor || 'Fornecedor não informado'}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Contratos */}
                            {contratos.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Contratos
                                    </h4>
                                    <div className="space-y-3">
                                        {contratos.map(c => (
                                            <div key={c.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg">CT {c.numero_contrato}</p>
                                                    <p className="text-xs text-slate-500 mt-1">Ref. Processo: <span className="font-mono font-bold text-slate-700">{c.processo.numero_processo}</span></p>
                                                    <p className="text-xs text-slate-400 mt-1">{c.fornecedor}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-slate-900 font-mono">R$ {c.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-tighter">Valor Contratado</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Empenhos */}
                            {empenhos.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Empenhos
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {empenhos.map(e => (
                                            <div key={e.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <p className="font-bold text-slate-900 font-mono">{e.numero_empenho}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Proc: {e.processo.numero_processo}</p>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{e.data_empenho ? new Date(e.data_empenho).toLocaleDateString('pt-BR') : '-'}</span>
                                                    <p className="font-bold text-emerald-700 font-mono">R$ {e.valor_empenho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Notas Fiscais */}
                            {notasFiscais.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Notas Fiscais (NFs)
                                    </h4>
                                    <div className="space-y-3">
                                        {notasFiscais.map(nf => (
                                            <div key={nf.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-slate-900">NF {nf.numero_nf}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                                                        CT {nf.contrato.numero_contrato} &bull; {nf.contrato.processo.numero_processo}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-slate-900 font-mono">R$ {nf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Ordens Bancárias */}
                            {ordensBancarias.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-slate-900"></span> Ordens Bancárias (OBs)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {ordensBancarias.map(ob => (
                                            <div key={ob.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-md">
                                                <p className="font-bold text-amber-500 font-mono text-lg">{ob.numero_ob}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Pago em: {ob.data_pagamento ? new Date(ob.data_pagamento).toLocaleDateString('pt-BR') : '-'}</p>
                                                <p className="mt-3 font-bold text-white font-mono text-right">R$ {ob.valor_ob.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {totalResults === 0 && (
                                <div className="p-20 text-center bg-white rounded-xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum resultado encontrado para "{q}"</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm mt-12">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl text-slate-400">🔍</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Pronto para Pesquisar</h3>
                            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                                Digite o número de um <strong>Processo SEI</strong>, <strong>Contrato</strong>, <strong>Empenho</strong> ou <strong>Nota Fiscal</strong> no campo acima para obter o detalhamento completo.
                            </p>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
