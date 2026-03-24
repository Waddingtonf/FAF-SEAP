import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function EmpenhosPage() {
    const empenhos = await prisma.empenho.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            processo: true,
            _count: {
                select: { ordens_bancarias: true }
            }
        }
    });

    const processos = await prisma.processo.findMany({
        orderBy: { numero_processo: 'asc' }
    });

    async function createEmpenho(formData: FormData) {
        'use server';
        const numero_empenho = formData.get('numero_empenho')?.toString();
        const processo_id = formData.get('processo_id')?.toString();
        const valor_empenho = Number(formData.get('valor_empenho'));
        const data_empenho = formData.get('data_empenho')?.toString();

        if (numero_empenho && processo_id && data_empenho) {
            await prisma.empenho.create({
                data: { numero_empenho, processo_id, valor_empenho: valor_empenho || 0, data_empenho: new Date(data_empenho) },
            });
        }
        redirect('/empenhos');
    }

    async function deleteEmpenho(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.empenho.delete({ where: { id } });
        }
        redirect('/empenhos');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/empenhos" />

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Empenhos</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Empenho</h3>
                        </div>
                        <div className="p-6">
                            {processos.length === 0 ? (
                                <div className="text-amber-700 bg-amber-50 p-4 rounded-md text-xs font-bold border border-amber-200 uppercase tracking-widest text-center">
                                    ⚠️ Cadastre ao menos um Processo SEI antes de continuar.
                                </div>
                            ) : (
                                <form action={createEmpenho} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nº do Empenho</label>
                                            <input type="text" name="numero_empenho" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-mono" placeholder="202XNE00000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Processo SEI Relacionado</label>
                                            <select name="processo_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-mono">
                                                {processos.map(p => (
                                                    <option key={p.id} value={p.id}>{p.numero_processo}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Valor do Empenho (R$)</label>
                                            <input type="number" step="0.01" name="valor_empenho" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="Ex: 50000.00" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                            Salvar Empenho
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {empenhos.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Empenho</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Processo SEI</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Empenhado</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Pagamentos</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {empenhos.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 font-mono tracking-tighter">{e.numero_empenho}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{e.processo.numero_processo}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right font-mono">
                                                    R$ {e.valor_empenho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-bold uppercase text-[10px] tracking-widest">
                                                    <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded">OBs: {e._count.ordens_bancarias}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <form action={deleteEmpenho} className="inline">
                                                        <input type="hidden" name="id" value={e.id} />
                                                        <DeleteButton warning="Excluir empenho?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhum empenho cadastrado.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
