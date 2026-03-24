'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SearchForm({ initialQuery = '' }: { initialQuery?: string }) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
        } else {
            router.push(`/busca`);
        }
    }

    return (
        <form onSubmit={handleSearch} className="flex w-full max-w-2xl mb-8 shadow-sm">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar Ordens Bancárias, Notas Fiscais ou Empenhos..."
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-neutral-800"
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-r-lg hover:bg-blue-700 transition-colors">
                Buscar
            </button>
        </form>
    );
}
