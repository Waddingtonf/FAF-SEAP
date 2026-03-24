import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function ContratosPage() {
    const contratos = await prisma.contrato.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            processo: true,
            _count: {
                select: { notas_fiscais: true, ordens_bancarias: true }
            }
        }
    });

    const processos = await prisma.processo.findMany({
        orderBy: { numero_processo: 'asc' }
    });

    async function createContrato(formData: FormData) {
        'use server';
        const numero_contrato = formData.get('numero_contrato')?.toString();
        const processo_id = formData.get('processo_id')?.toString();
        const valor_contrato = parseFloat(formData.get('valor_contrato')?.toString() || '0');

        if (numero_contrato && processo_id && valor_contrato > 0) {
            await prisma.contrato.create({
                data: { numero_contrato, processo_id, valor_contrato },
            });
        }
        redirect('/contratos');
    }

    async function deleteContrato(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.contrato.delete({ where: { id } });
        }
        redirect('/contratos');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/contratos" />

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Contratos</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Contrato</h3>
                        </div>
                        <div className="p-6">
                            {processos.length === 0 ? (
                                <div className="text-amber-700 bg-amber-50 p-4 rounded-md text-xs font-bold border border-amber-200 uppercase tracking-widest text-center">
                                    ⚠️ Cadastre ao menos um Processo SEI antes de continuar.
                                </div>
                            ) : (
                                <form action={createContrato} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nº do Contrato</label>
                                            <input type="text" name="numero_contrato" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-bold" placeholder="00/2026" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Processo SEI</label>
                                            <select name="processo_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-mono">
                                                {processos.map(p => (
                                                    <option key={p.id} value={p.id}>{p.numero_processo}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Valor Contratado (R$)</label>
                                            <input type="number" step="0.01" name="valor_contrato" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="Ex: 150000.00" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                            Salvar Contrato
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {contratos.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Processo SEI</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Contratado</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {contratos.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{c.numero_contrato}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{c.processo.numero_processo}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right font-mono">
                                                    R$ {c.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                                                    <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold mx-1" title="Notas Fiscais">NF: {c._count.notas_fiscais}</span>
                                                    <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold mx-1" title="Ordens Bancárias">OB: {c._count.ordens_bancarias}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <form action={deleteContrato} className="inline">
                                                        <input type="hidden" name="id" value={c.id} />
                                                        <DeleteButton warning="Excluir contrato e tudo vinculado a ele?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhum contrato cadastrado.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
