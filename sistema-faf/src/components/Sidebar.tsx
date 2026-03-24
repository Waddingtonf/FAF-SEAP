import Link from 'next/link';

export function Sidebar({ currentPath }: { currentPath?: string }) {
    const getLinkClasses = (path: string) => {
        const isActive = currentPath === path;
        return `block px-3 py-2 font-medium rounded-md transition-colors ${isActive
            ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-500 pl-2'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 pl-3'
            }`;
    };

    return (
        <aside className="w-64 bg-slate-950 border-r border-slate-800 shrink-0 min-h-screen flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-800/80">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                        <span className="text-slate-900 font-bold text-sm tracking-tighter">PP</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-100 uppercase">Polícia Penal <span className="text-amber-500">RN</span></h1>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-2 ml-11">Gestão FAF</p>
            </div>
            <nav className="mt-6 flex-1 px-4 space-y-1">
                <Link href="/" className={getLinkClasses('/')}>Painel de Execução</Link>
                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Estrutural
                    </p>
                </div>
                <Link href="/fafs" className={getLinkClasses('/fafs')}>Instrumentos FAF</Link>
                <Link href="/contas" className={getLinkClasses('/contas')}>Contas Bancárias</Link>

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Operacional
                    </p>
                </div>
                <Link href="/processos" className={getLinkClasses('/processos')}>Processos SEI</Link>
                <Link href="/contratos" className={getLinkClasses('/contratos')}>Contratos</Link>
                <Link href="/empenhos" className={getLinkClasses('/empenhos')}>Empenhos</Link>

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Financeiro
                    </p>
                </div>
                <Link href="/notas" className={getLinkClasses('/notas')}>Notas Fiscais</Link>
                <Link href="/ordens" className={getLinkClasses('/ordens')}>Ordens Bancárias</Link>
            </nav>
            <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
                SEAP/RN &copy; 2026
            </div>
        </aside>
    );
}
