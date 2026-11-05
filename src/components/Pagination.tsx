interface PaginationProps {
  total: number;
  offset: number;
  limit: number;
  disabled?: boolean;
  onChange: (nextOffset: number) => void;
}

export function Pagination({ total, offset, limit, disabled = false, onChange }: PaginationProps) {
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + limit, total);

  return (
    <nav className="pagination" aria-label="Paginación de tickets">
      <p aria-live="polite">
        Mostrando {first}–{last} de {total} tickets
      </p>

      <button
        type="button"
        disabled={disabled || offset === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Anterior
      </button>

      <button
        type="button"
        disabled={disabled || offset + limit >= total}
        onClick={() => onChange(offset + limit)}
      >
        Siguiente
      </button>
    </nav>
  );
}
