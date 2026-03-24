import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SearchForm } from '@/components/SearchForm';

export const dynamic = 'force-dynamic';

export default async function BuscaPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }> | { q?: string };
}) {
    // Await the unrolled `searchParams` on newer Next.js versions. We use it cautiously to support both types.
    const resolvedSearchParams = await Promise.resolve(searchParams);
    const q = resolvedSearchParams.q || '';

    let notasFiscais: any[] = [];
    let ordensBancarias: any[] = [];
    let empenhos: any[] = [];

    if (q) {
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

        empenhos = await prisma.empenho.findMany({
            where: { numero_empenho: { contains: q } },
            include: { processo: true }
        });
    }

    return (
        <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
            <aside className="w-64 bg-white border-r border-neutral-200">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight text-blue-600">FAF Gestão</h1>
                </div>
                <nav className="mt-4 px-4 space-y-1">
                    <Link href="/" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Dashboard</Link>
                    <Link href="/contas" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Contas Bancárias</Link>
                    <Link href="/fafs" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Instrumentos (FAFs)</Link>
                    <Link href="/processos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Processos</Link>
                    <Link href="/contratos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Contratos</Link>
                    <Link href="/empenhos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Empenhos</Link>
                </nav>
            </aside>

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-semibold text-neutral-800 mb-6">Busca Global</h2>

                    <SearchForm initialQuery={q} />

                    {q && (
                        <div className="space-y-8">
                            <h3 className="text-xl text-neutral-600">Resultados para: <span className="font-bold text-neutral-800">"{q}"</span></h3>

                            {/* Ordens Bancárias */}
                            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                                    <h4 className="font-semibold text-neutral-800">Ordens Bancárias</h4>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">{ordensBancarias.length}</span>
                                </div>
                                <div className="p-0">
                                    {ordensBancarias.length > 0 ? (
                                        <ul className="divide-y divide-neutral-200">
                                            {ordensBancarias.map(ob => (
                                                <li key={ob.id} className="p-6 hover:bg-neutral-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-blue-600 font-medium font-mono text-lg">{ob.numero_ob}</p>
                                                            <p className="text-sm text-neutral-500 mt-1">Pagamento processado em: {ob.data_pagamento ? new Date(ob.data_pagamento).toLocaleDateString('pt-BR') : '-'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-neutral-900">R$ {ob.valor_ob.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="p-6 text-neutral-500 text-sm">Nenhuma ordem bancária encontrada para "{q}".</p>
                                    )}
                                </div>
                            </div>

                            {/* Notas Fiscais */}
                            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                                    <h4 className="font-semibold text-neutral-800">Notas Fiscais</h4>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">{notasFiscais.length}</span>
                                </div>
                                <div className="p-0">
                                    {notasFiscais.length > 0 ? (
                                        <ul className="divide-y divide-neutral-200">
                                            {notasFiscais.map(nf => (
                                                <li key={nf.id} className="p-6 hover:bg-neutral-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-blue-600 font-medium font-mono text-lg">NF {nf.numero_nf}</p>
                                                            <p className="text-sm text-neutral-500 mt-1">
                                                                Contrato: <span className="font-medium text-neutral-700">{nf.contrato.numero_contrato}</span> &bull;
                                                                Processo: <span className="font-medium text-neutral-700">{nf.contrato.processo.numero_processo}</span>
                                                            </p>
                                                            <p className="text-sm text-neutral-500">Emissão: {nf.data_emissao ? new Date(nf.data_emissao).toLocaleDateString('pt-BR') : '-'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-neutral-900">R$ {nf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="p-6 text-neutral-500 text-sm">Nenhuma nota fiscal encontrada para "{q}".</p>
                                    )}
                                </div>
                            </div>

                            {/* Empenhos */}
                            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                                    <h4 className="font-semibold text-neutral-800">Empenhos</h4>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">{empenhos.length}</span>
                                </div>
                                <div className="p-0">
                                    {empenhos.length > 0 ? (
                                        <ul className="divide-y divide-neutral-200">
                                            {empenhos.map(emp => (
                                                <li key={emp.id} className="p-6 hover:bg-neutral-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-blue-600 font-medium font-mono text-lg">{emp.numero_empenho}</p>
                                                            <p className="text-sm text-neutral-500 mt-1">
                                                                Processo Vinculado: <span className="font-medium text-neutral-700">{emp.processo.numero_processo}</span>
                                                            </p>
                                                            <p className="text-sm text-neutral-500">Data Empenho: {emp.data_empenho ? new Date(emp.data_empenho).toLocaleDateString('pt-BR') : '-'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-neutral-900">R$ {emp.valor_empenho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="p-6 text-neutral-500 text-sm">Nenhum empenho encontrado para "{q}".</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {!q && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-medium text-neutral-800 mb-2">Digite sua busca no campo acima</h3>
                            <p className="text-neutral-500 max-w-md mx-auto">
                                Você pode procurar pelo número exato da Ordem Bancária, pelo número da Nota Fiscal ou numeração de Empenho de forma fácil.
                            </p>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
