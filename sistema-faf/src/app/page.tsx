import { SearchForm } from '@/components/SearchForm';
import { Sidebar } from '@/components/Sidebar';
import { prisma } from '@/lib/prisma';
import { getExcelAggregates } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const excelData = getExcelAggregates();
  const fafs = await prisma.fafPlanoLdo.findMany({
    include: {
      conta_bancaria: true,
      processos: {
        include: {
          empenhos: { include: { ordens_bancarias: { include: { ob: true } } } },
          contratos: {
            include: {
              ordens_bancarias: { include: { ob: true } },
              notas_fiscais: { include: { ordens_bancarias: { include: { ob: true } } } }
            }
          }
        }
      }
    },
    orderBy: { instrumento: 'asc' }
  });

  const dashboardData = fafs.map(faf => {
    const key = `${faf.instrumento}|${faf.modalidade}`;
    const totalAutorizado = excelData[key] || 0;

    const uniqueOBs = new Map<string, number>();

    faf.processos.forEach(proc => {
      proc.empenhos.forEach(emp => {
        emp.ordens_bancarias.forEach(obRelation => {
          uniqueOBs.set(obRelation.ob.id, obRelation.ob.valor_ob);
        });
      });
      proc.contratos.forEach(ct => {
        ct.ordens_bancarias.forEach(obRelation => {
          uniqueOBs.set(obRelation.ob.id, obRelation.ob.valor_ob);
        });
        ct.notas_fiscais.forEach(nf => {
          nf.ordens_bancarias.forEach(obRelation => {
            uniqueOBs.set(obRelation.ob.id, obRelation.ob.valor_ob);
          });
        });
      });
    });

    const totalExecutado = Array.from(uniqueOBs.values()).reduce((acc, val) => acc + val, 0);
    const saldo = totalAutorizado - totalExecutado;
    const porcentagemExecucao = totalAutorizado > 0 ? (totalExecutado / totalAutorizado) * 100 : 0;

    return {
      id: faf.id,
      instrumento: faf.instrumento,
      modalidade: faf.modalidade || '-',
      conta: faf.conta_bancaria.numero_conta,
      totalAutorizado,
      totalExecutado,
      saldo,
      porcentagemExecucao
    };
  });

  // Global sums
  const globalAutorizado = dashboardData.reduce((acc, d) => acc + d.totalAutorizado, 0);
  const globalExecutado = dashboardData.reduce((acc, d) => acc + d.totalExecutado, 0);
  const globalSaldo = globalAutorizado - globalExecutado;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentPath="/" />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 uppercase">Painel de Execução FAF</h2>
            <p className="text-slate-500 mb-6">Comparativo de Valores Autorizados vs Executados por Instrumento / Conta.</p>
            <SearchForm />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-100 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Orçamento Autorizado</p>
              <p className="text-3xl font-bold text-slate-900 relative z-10">R$ {globalAutorizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-lg border border-emerald-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <p className="text-sm font-semibold text-emerald-700 uppercase tracking-widest mb-1 relative z-10">Total Executado (OBs)</p>
              <p className="text-3xl font-bold text-emerald-800 relative z-10">R$ {globalExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-lg border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <p className="text-sm font-semibold text-amber-700 uppercase tracking-widest mb-1 relative z-10">Saldo Restante</p>
              <p className="text-3xl font-bold text-amber-800 relative z-10">R$ {globalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Resumo por Ano */}
          <div className="mb-10">
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50">
                <h3 className="text-lg font-semibold text-neutral-800">Resumo de Execução por Ano</h3>
              </div>
              <div className="p-0">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ano</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Autorizado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Executado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Saldo</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {Array.from(new Set(dashboardData.map(d => d.instrumento.split(' ').pop()))).filter(year => year && !isNaN(Number(year))).sort().map(year => {
                      const yearData = dashboardData.filter(d => d.instrumento.endsWith(year!));
                      const totalAut = yearData.reduce((acc, d) => acc + d.totalAutorizado, 0);
                      const totalExec = yearData.reduce((acc, d) => acc + d.totalExecutado, 0);
                      const perc = totalAut > 0 ? (totalExec / totalAut) * 100 : 0;

                      return (
                        <tr key={year}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">{year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 text-right">
                            R$ {totalAut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold text-right">
                            R$ {totalExec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-700 text-right font-medium">
                            R$ {(totalAut - totalExec).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 text-center">
                            <span className="font-medium">{perc.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Status Detalhado por Instrumento</h3>
            </div>
            <div className="p-0">
              {dashboardData.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidade</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Autorizado</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Pagamentos (OBs)</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Restante</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {dashboardData.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 font-mono tracking-wide">{d.conta}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{d.instrumento}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">{d.modalidade}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium text-right">
                          R$ {d.totalAutorizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700 font-bold text-right">
                          R$ {d.totalExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-700 font-medium text-right">
                          R$ {d.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold inline-block w-10 text-right">{d.porcentagemExecucao.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(isNaN(d.porcentagemExecucao) || !isFinite(d.porcentagemExecucao) ? 0 : d.porcentagemExecucao, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500 font-medium">
                  Nenhum FAF configurado. Comece adicionando contas e instrumentos.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
