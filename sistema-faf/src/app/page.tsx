import { SearchForm } from '@/components/SearchForm';
import { Sidebar } from '@/components/Sidebar';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Load FAF instruments directly from DB with cached authorized totals
  const fafs = await prisma.fafPlanoLdo.findMany({
    include: {
      conta_bancaria: true,
      processos: { select: { id: true } }
    },
    orderBy: [{ instrumento: 'asc' }, { modalidade: 'asc' }]
  });

  const dashboardData = fafs.map(faf => {
    const totalAutorizado = faf.valor_autorizado_total;
    const totalExecutado = faf.valor_total;
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
      porcentagemExecucao,
      numProcessos: faf.processos.length,
    };
  });

  // Global totals
  const globalAutorizado = dashboardData.reduce((s, d) => s + d.totalAutorizado, 0);
  const globalExecutado = dashboardData.reduce((s, d) => s + d.totalExecutado, 0);
  const globalSaldo = globalAutorizado - globalExecutado;
  const globalPerc = globalAutorizado > 0 ? (globalExecutado / globalAutorizado) * 100 : 0;

  // Group by instrument (summming modalidades)
  const byInstrumento = dashboardData.reduce<Record<string, { aut: number; exec: number }>>((map, d) => {
    if (!map[d.instrumento]) map[d.instrumento] = { aut: 0, exec: 0 };
    map[d.instrumento].aut += d.totalAutorizado;
    map[d.instrumento].exec += d.totalExecutado;
    return map;
  }, {});

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const pct = (exec: number, aut: number) => {
    if (!aut || isNaN(exec / aut)) return 0;
    return Math.min((exec / aut) * 100, 999);
  };
  const barColor = (p: number) => p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentPath="/" />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 uppercase">Painel de Execução FAF</h2>
            <p className="text-slate-500 text-sm mb-6">Comparativo: Valores Autorizados (Dados FAF) vs. Pagamentos Realizados (OBs do PAINEL)</p>
            <SearchForm />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Autorizado Total</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">R$ {fmt(globalAutorizado)}</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Executado (OBs)</p>
              <p className="text-2xl font-bold text-emerald-700 font-mono">R$ {fmt(globalExecutado)}</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
              <p className={`text-2xl font-bold font-mono ${globalSaldo < 0 ? 'text-red-700' : 'text-amber-700'}`}>R$ {fmt(globalSaldo)}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-md">
              <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.2em] mb-1">% Execução Global</p>
              <p className="text-2xl font-bold text-amber-500 font-mono">{pct(globalExecutado, globalAutorizado).toFixed(1)}%</p>
            </div>
          </div>

          {/* Summary by Instrument */}
          <div className="mb-8 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Resumo por Instrumento</h3>
            </div>
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Autorizado</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Executado (OBs)</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Execução</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {Object.entries(byInstrumento).sort(([a], [b]) => a.localeCompare(b)).map(([instrumento, { aut, exec }]) => {
                  const saldo = aut - exec;
                  const p = pct(exec, aut);
                  return (
                    <tr key={instrumento} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">{instrumento}</td>
                      <td className="px-6 py-3 text-sm text-slate-700 text-right font-mono">{aut > 0 ? `R$ ${fmt(aut)}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-3 text-sm text-emerald-700 font-bold text-right font-mono">R$ {fmt(exec)}</td>
                      <td className={`px-6 py-3 text-sm text-right font-mono font-medium ${saldo < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                        {aut > 0 ? `R$ ${fmt(saldo)}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-12 text-left ${aut === 0 ? 'text-slate-300' : p >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
                            {aut > 0 ? `${p.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail by Conta / Instrument / Modalidade */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Detalhamento por Conta · Modalidade</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fonte: Dados FAF.xlsx + PAINEL FAF</span>
            </div>
            {dashboardData.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidade</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Proc.</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Autorizado</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Executado</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {dashboardData.map(d => {
                    const p = pct(d.totalExecutado, d.totalAutorizado);
                    const hasAut = d.totalAutorizado > 0;
                    return (
                      <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${!hasAut && d.totalExecutado === 0 ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-2 text-xs font-mono font-bold text-slate-600">{d.conta}</td>
                        <td className="px-4 py-2 text-sm font-bold text-slate-900">{d.instrumento}</td>
                        <td className="px-4 py-2">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{d.modalidade}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{d.numProcessos}</span>
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-slate-800 text-right">
                          {hasAut ? `R$ ${fmt(d.totalAutorizado)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono font-bold text-emerald-700 text-right">
                          {d.totalExecutado > 0 ? `R$ ${fmt(d.totalExecutado)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-4 py-2 text-sm font-mono font-medium text-right ${d.saldo < 0 ? 'text-red-600' : hasAut ? 'text-amber-700' : 'text-slate-300'}`}>
                          {hasAut ? `R$ ${fmt(d.saldo)}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {hasAut ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-1.5 rounded-full ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
                              </div>
                              <span className={`text-[11px] font-bold w-10 text-right ${p >= 100 ? 'text-red-600' : 'text-slate-600'}`}>{p.toFixed(1)}%</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-slate-400 font-medium text-sm">
                Nenhum instrumento FAF cadastrado.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
