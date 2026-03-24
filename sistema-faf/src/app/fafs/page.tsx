import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function FafsPage() {
    const fafs = await prisma.fafPlanoLdo.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            conta_bancaria: true,
            _count: {
                select: { planos_aplicacao: true, processos: true }
            }
        }
    });

    const contas = await prisma.contaBancaria.findMany({
        orderBy: { numero_conta: 'asc' }
    });

    async function createInstrumento(formData: FormData) {
        'use server';
        const instrumento = formData.get('instrumento')?.toString();
        const modalidade = formData.get('modalidade')?.toString();
        const anoRaw = formData.get('ano')?.toString();
        const ano = anoRaw ? parseInt(anoRaw) : null;
        const valor_total = parseFloat(formData.get('valor_total')?.toString() || '0');
        const conta_bancaria_id = formData.get('conta_bancaria_id')?.toString();

        if (instrumento && modalidade && conta_bancaria_id) {
            await prisma.fafPlanoLdo.create({
                data: { instrumento, modalidade, ano, valor_total, conta_bancaria_id },
            });
        }
        redirect('/fafs');
    }

    async function deleteInstrumento(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.fafPlanoLdo.delete({ where: { id } });
        }
        redirect('/fafs');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/fafs" />

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Instrumentos / FAFs</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Instrumento</h3>
                        </div>
                        <div className="p-6">
                            {contas.length === 0 ? (
                                <div className="text-amber-700 bg-amber-50 p-4 rounded-md text-xs font-bold border border-amber-200 uppercase tracking-widest text-center">
                                    ⚠️ Cadastre ao menos uma Conta Bancária antes de continuar.
                                </div>
                            ) : (
                                <form action={createInstrumento} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nome do Instrumento / FAF</label>
                                            <input type="text" name="instrumento" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="Ex: FAF 2026, FONTE 500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Modalidade</label>
                                            <select name="modalidade" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                                                <option value="OBRAS">OBRAS</option>
                                                <option value="CUSTEIO">CUSTEIO</option>
                                                <option value="CAPITAL">CAPITAL</option>
                                                <option value="OBRAS + CAPITAL">OBRAS + CAPITAL</option>
                                                <option value="RECURSO ORDINÁRIO ESTADUAL">RECURSO ORDINÁRIO ESTADUAL</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ano</label>
                                            <input type="number" name="ano" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="2026" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Conta Vinculada</label>
                                            <select name="conta_bancaria_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                                                {contas.map(conta => (
                                                    <option key={conta.id} value={conta.id}>{conta.numero_conta}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Valor Total (R$)</label>
                                            <input type="number" step="0.01" name="valor_total" defaultValue={0} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                            Salvar Instrumento
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {fafs.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidade</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Processos</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {fafs.map(faf => (
                                            <tr key={faf.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono tracking-tighter">{faf.conta_bancaria.numero_conta}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{faf.instrumento}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-1 rounded inline-block text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-200">{faf.modalidade}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right font-mono">
                                                    R$ {faf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-bold">
                                                    {faf._count.processos}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <form action={deleteInstrumento} className="inline">
                                                        <input type="hidden" name="id" value={faf.id} />
                                                        <DeleteButton warning="Excluir instrumento?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhum instrumento registrado.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
