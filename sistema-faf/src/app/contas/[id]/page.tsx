import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ContaDetailPage({ params }: { params: { id: string } }) {
    const conta = await prisma.contaBancaria.findUnique({
        where: { id: params.id },
        include: {
            instrumentos: {
                include: {
                    planos_aplicacao: true,
                }
            }
        }
    });

    if (!conta) {
        return notFound();
    }

    const processos = await prisma.processo.findMany({
        where: { faf: { conta_bancaria_id: conta.id } },
        include: {
            contratos: {
                include: { ordens_bancarias: { include: { ob: true } } }
            },
            empenhos: {
                include: { ordens_bancarias: { include: { ob: true } } }
            }
        }
    });

    let valorPlanejadoTotal = 0;
    let valorContratadoTotal = 0;
    let valorEmpenhadoTotal = 0;
    let valorPagoTotal = 0;

    const obsPagas = new Set<string>();

    conta.instrumentos.forEach(faf => {
        faf.planos_aplicacao.forEach(plano => {
            valorPlanejadoTotal += plano.valor_autorizado;
        });
    });

    processos.forEach(proc => {
        proc.contratos.forEach(c => {
            valorContratadoTotal += c.valor_contrato;
            c.ordens_bancarias.forEach(obc => {
                if (!obsPagas.has(obc.ob.id)) {
                    valorPagoTotal += obc.ob.valor_ob;
                    obsPagas.add(obc.ob.id);
                }
            });
        });

        proc.empenhos.forEach(e => {
            valorEmpenhadoTotal += e.valor_empenho;
            e.ordens_bancarias.forEach(obe => {
                if (!obsPagas.has(obe.ob.id)) {
                    valorPagoTotal += obe.ob.valor_ob;
                    obsPagas.add(obe.ob.id);
                }
            });
        });
    });

    const percentualPago = valorPlanejadoTotal > 0 ? (valorPagoTotal / valorPlanejadoTotal) * 100 : 0;
    const saldoNãoExecutado = valorPlanejadoTotal - valorPagoTotal;

    return (
        <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
            <aside className="w-64 bg-white border-r border-neutral-200">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight text-blue-600">FAF Gestão</h1>
                </div>
                <nav className="mt-4 px-4 space-y-1">
                    <Link href="/" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Dashboard</Link>
                    <Link href="/contas" className="block px-3 py-2 bg-blue-50 text-blue-700 font-medium rounded-md">Contas Bancárias</Link>
                    <Link href="/fafs" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Instrumentos (FAFs)</Link>
                    <Link href="/processos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Processos</Link>
                    <Link href="/contratos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Contratos</Link>
                    <Link href="/empenhos" className="block px-3 py-2 text-neutral-600 hover:bg-neutral-50 font-medium rounded-md">Empenhos</Link>
                </nav>
            </aside>

            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-6 flex items-center">
                        <Link href="/contas" className="text-blue-600 hover:underline mr-4">← Voltar</Link>
                    </div>

                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-3xl font-semibold text-neutral-800">Conta {conta.numero_conta}</h2>
                            <p className="text-neutral-500 mt-1">{conta.descricao}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-neutral-500">Instrumentos Associados</p>
                            <p className="text-2xl font-bold text-neutral-900">{conta.instrumentos.length}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm border-l-4 border-l-blue-500">
                            <p className="text-sm font-medium text-neutral-500 mb-1">PLANO APLIC. (TOTAL)</p>
                            <p className="text-2xl font-bold text-neutral-900">R$ {valorPlanejadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm border-l-4 border-l-amber-500">
                            <p className="text-sm font-medium text-neutral-500 mb-1">VALOR EMPENHADO</p>
                            <p className="text-2xl font-bold text-neutral-900">R$ {valorEmpenhadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm border-l-4 border-l-purple-500">
                            <p className="text-sm font-medium text-neutral-500 mb-1">VALOR CONTRATADO</p>
                            <p className="text-2xl font-bold text-neutral-900">R$ {valorContratadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm border-l-4 border-l-green-500">
                            <p className="text-sm font-medium text-neutral-500 mb-1">VALOR PAGO (OBS)</p>
                            <p className="text-2xl font-bold text-green-600">R$ {valorPagoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-sm font-medium text-neutral-500 mb-1">Progresso Financeiro (Pago vs Planejado)</p>
                                <div className="text-xl font-bold text-neutral-900">{percentualPago.toFixed(2)}% Concluído</div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-neutral-500 mb-1">Saldo a Executar</p>
                                <div className="text-xl font-bold text-red-500">R$ {saldoNãoExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(percentualPago, 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-neutral-200">
                            <h3 className="text-lg font-semibold text-neutral-800">Instrumentos da Conta</h3>
                        </div>
                        <div className="p-0">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Instrumento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Modalidade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Itens de Plano</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Saldo Ajustado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {conta.instrumentos.map(faf => {
                                        const localTotal = faf.planos_aplicacao.reduce((acc, curr) => acc + curr.valor_autorizado, 0);
                                        return (
                                            <tr key={faf.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">{faf.instrumento}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{faf.modalidade}</td>
                                                <td className="px-6 py-4 text-sm text-neutral-500">
                                                    {faf.planos_aplicacao.length}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 text-right">
                                                    R$ {localTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
