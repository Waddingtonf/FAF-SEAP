import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DeleteButton } from '@/components/DeleteButton';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function ProcessosPage() {
    const processos = await prisma.processo.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            faf: {
                include: { conta_bancaria: true }
            },
            _count: {
                select: { contratos: true, empenhos: true }
            }
        }
    });

    const fafs = await prisma.fafPlanoLdo.findMany({
        orderBy: { instrumento: 'asc' },
        include: { conta_bancaria: true }
    });

    async function createProcesso(formData: FormData) {
        'use server';
        const numero_processo = formData.get('numero_processo')?.toString();
        const faf_id = formData.get('faf_id')?.toString();
        const fornecedor = formData.get('fornecedor')?.toString();

        if (numero_processo && faf_id) {
            await prisma.processo.create({
                data: { numero_processo, faf_id, fornecedor },
            });
        }
        redirect('/processos');
    }

    async function deleteProcesso(formData: FormData) {
        'use server';
        const id = formData.get('id')?.toString();
        if (id) {
            await prisma.processo.delete({ where: { id } });
        }
        redirect('/processos');
    }

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar currentPath="/processos" />

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Processos de Execução</h2>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-10">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Processo SEI</h3>
                        </div>
                        <div className="p-6">
                            {fafs.length === 0 ? (
                                <div className="text-amber-700 bg-amber-50 p-4 rounded-md text-xs font-bold border border-amber-200 uppercase tracking-widest text-center">
                                    ⚠️ Cadastre ao menos um Instrumento / FAF antes de continuar.
                                </div>
                            ) : (
                                <form action={createProcesso} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nº do Processo SEI</label>
                                            <input type="text" name="numero_processo" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 font-mono" placeholder="000.0000.000/2026" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Vincular a FAF</label>
                                            <select name="faf_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                                                {fafs.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.instrumento} - {f.modalidade} ({f.conta_bancaria.numero_conta})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Fornecedor (Opcional)</label>
                                            <input type="text" name="fornecedor" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" placeholder="Nome da empresa..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-colors border border-slate-800">
                                            Salvar Processo
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-0">
                            {processos.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Processo SEI</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento / FAF</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {processos.map(proc => (
                                            <tr key={proc.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 font-mono">{proc.numero_processo}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    <span className="font-bold">{proc.faf.instrumento}</span> <br />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{proc.faf.modalidade}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{proc.fornecedor || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                                                    <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold mx-1" title="Contratos">CONT: {proc._count.contratos}</span>
                                                    <span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold mx-1" title="Empenhos">EMP: {proc._count.empenhos}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link href={`/processos/${proc.id}`} className="text-slate-900 hover:text-amber-600 mr-4 font-bold text-xs uppercase tracking-widest border border-slate-200 bg-slate-50 px-3 py-1.5 rounded transition-all hover:border-amber-200">Ver Itens</Link>
                                                    <form action={deleteProcesso} className="inline">
                                                        <input type="hidden" name="id" value={proc.id} />
                                                        <DeleteButton warning="Excluir processo e dependências?" />
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium">Nenhum processo em execução.</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
