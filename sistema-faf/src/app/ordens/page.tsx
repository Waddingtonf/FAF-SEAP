import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function OrdensBancariasPage() {
    const ordens = await prisma.ordemBancaria.findMany({
        orderBy: { data_pagamento: 'desc' },
        include: {
            empenhos: { include: { empenho: { include: { processo: true } } } },
            notas_fiscais: { include: { nf: { include: { contrato: { include: { processo: true } } } } } },
            contratos: { include: { contrato: { include: { processo: true } } } },
            _count: {
                select: { notas_fiscais: true, empenhos: true, contratos: true }
            }
        }
    });

    async function createOrdemBancaria(formData: FormData) {
        'use server';
        const numero_ob = formData.get('numero_ob')?.toString();
        const valor_ob = Number(formData.get('valor_ob'));
        const data_pagamento = formData.get('data_pagamento')?.toString();

        if (numero_ob && data_pagamento) {
            await prisma.ordemBancaria.create({
                data: { numero_ob, valor_ob: valor_ob || 0, data_pagamento: new Date(data_pagamento) },
            });
        }
        redirect('/ordens');
    }

    async function deleteOrdemBancaria(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.ordemBancaria.delete({ where: { id } });
        }
        redirect('/ordens');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/ordens" />

            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Ordens Bancárias (OB)</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Lançar Nova Ordem Bancária</h3>
                        </div>
                        <div className="p-6">
                            <form action={createOrdemBancaria} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Número da OB</label>
                                        <input type="text" name="numero_ob" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-bold" placeholder="Ex: OB00099" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Valor da OB (R$)</label>
                                        <input type="number" step="0.01" name="valor_ob" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-bold" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Data de Pagamento</label>
                                        <input type="date" name="data_pagamento" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                        Salvar OB
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {ordens.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Número da OB</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Processos</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Pago</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Vínculos</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {ordens.map(ob => {
                                            const processosSet = new Set<string>();
                                            ob.empenhos.forEach(e => processosSet.add(e.empenho.processo.numero_processo));
                                            ob.notas_fiscais.forEach(n => processosSet.add(n.nf.contrato.processo.numero_processo));
                                            ob.contratos.forEach(c => processosSet.add(c.contrato.processo.numero_processo));
                                            const procList = Array.from(processosSet);

                                            return (
                                                <tr key={ob.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{ob.numero_ob}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">
                                                        {procList.length > 0 ? procList.join(', ') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 uppercase font-bold text-[10px]">
                                                        {ob.data_pagamento ? new Date(ob.data_pagamento).toLocaleDateString('pt-BR') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right font-mono">
                                                        R$ {ob.valor_ob.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                                                        <div className="flex gap-1 justify-center">
                                                            <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold" title="NFs Agrupadas">NFs: {ob._count.notas_fiscais}</span>
                                                            <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold" title="Empenhos Utilizados">EMP: {ob._count.empenhos}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <form action={deleteOrdemBancaria} className="inline">
                                                            <input type="hidden" name="id" value={ob.id} />
                                                            <DeleteButton warning="Excluir Ordem Bancária?" />
                                                        </form>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhuma Ordem Bancária lançada.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
