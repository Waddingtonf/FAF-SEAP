import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function ContasPage() {
    const contas = await prisma.contaBancaria.findMany({
        orderBy: { numero_conta: 'asc' },
        include: {
            _count: {
                select: { instrumentos: true }
            }
        }
    });

    async function createConta(formData: FormData) {
        'use server';
        const numero_conta = formData.get('numero_conta')?.toString();
        const descricao = formData.get('descricao')?.toString();

        if (numero_conta) {
            await prisma.contaBancaria.create({
                data: { numero_conta, descricao },
            });
        }
        redirect('/contas');
    }

    async function deleteConta(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.contaBancaria.delete({ where: { id } });
        }
        redirect('/contas');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/contas" />

            <main className="flex-1 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Contas Bancárias</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Nova Conta</h3>
                        </div>
                        <div className="p-6">
                            <form action={createConta} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Número da Conta</label>
                                        <input name="numero_conta" required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm" placeholder="Ex: 12345-6" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Descrição</label>
                                        <input name="descricao" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm" placeholder="Informações adicionais..." />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                        Salvar Conta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {contas.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumentos / FAFs</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {contas.map(conta => (
                                            <tr key={conta.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                                    <Link href={`/contas/${conta.id}`} className="text-slate-900 hover:text-amber-600 hover:underline font-mono tracking-tight">
                                                        {conta.numero_conta}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{conta.descricao || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-mono">
                                                    {conta._count.instrumentos}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <form action={deleteConta} className="inline">
                                                        <input type="hidden" name="id" value={conta.id} />
                                                        <DeleteButton warning="Excluir conta?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhuma conta bancária registrada.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
