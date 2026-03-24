import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function NotasFiscaisPage() {
    const notasFiscais = await prisma.notaFiscal.findMany({
        orderBy: { data_emissao: 'desc' },
        include: {
            contrato: {
                include: { processo: true }
            },
            _count: {
                select: { ordens_bancarias: true }
            }
        }
    });

    const contratos = await prisma.contrato.findMany({
        orderBy: { numero_contrato: 'asc' },
        include: { processo: true }
    });

    async function createNotaFiscal(formData: FormData) {
        'use server';
        const numero_nf = formData.get('numero_nf')?.toString();
        const contrato_id = formData.get('contrato_id')?.toString();
        const valor_total = Number(formData.get('valor_total'));
        const data_emissao = formData.get('data_emissao')?.toString();

        if (numero_nf && contrato_id && data_emissao) {
            await prisma.notaFiscal.create({
                data: { numero_nf, contrato_id, valor_total: valor_total || 0, data_emissao: new Date(data_emissao) },
            });
        }
        redirect('/notas');
    }

    async function deleteNotaFiscal(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.notaFiscal.delete({ where: { id } });
        }
        redirect('/notas');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/notas" />

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Notas Fiscais</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Lançar Nova NF</h3>
                        </div>
                        <div className="p-6">
                            {contratos.length === 0 ? (
                                <div className="text-amber-700 bg-amber-50 p-4 rounded-md text-xs font-bold border border-amber-200 uppercase tracking-widest text-center">
                                    ⚠️ Cadastre ao menos um Contrato antes de registrar Notas Fiscais.
                                </div>
                            ) : (
                                <form action={createNotaFiscal} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Número da NF</label>
                                            <input type="text" name="numero_nf" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-bold" placeholder="Ex: 50029" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Vincular a Contrato / Processo</label>
                                            <select name="contrato_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                                                {contratos.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        CT {c.numero_contrato} (Proc: {c.processo.numero_processo})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Valor Total (R$)</label>
                                            <input type="number" step="0.01" name="valor_total" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Data de Emissão</label>
                                            <input type="date" name="data_emissao" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                            Salvar NF
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {notasFiscais.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">NF</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vínculo</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {notasFiscais.map(nf => (
                                            <tr key={nf.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{nf.numero_nf}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    <span className="font-bold">CT {nf.contrato.numero_contrato}</span> <br />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Proc: {nf.contrato.processo.numero_processo}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {nf.data_emissao ? new Date(nf.data_emissao).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right font-mono">
                                                    R$ {nf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <form action={deleteNotaFiscal} className="inline">
                                                        <input type="hidden" name="id" value={nf.id} />
                                                        <DeleteButton warning="Excluir Nota Fiscal?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhuma Nota Fiscal lançada.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
