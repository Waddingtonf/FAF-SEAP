'use client';

export function DeleteButton({ warning = 'Excluir?' }: { warning?: string }) {
    return (
        <button
            type="submit"
            className="text-red-600 hover:text-red-900"
            onClick={(e) => {
                if (!confirm(warning)) {
                    e.preventDefault();
                }
            }}
        >
            Excluir
        </button>
    );
}
