type PaginationProps = {
  total: number;
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
};

export function Pagination({ total, offset, limit, onChange }: PaginationProps) {
  const previous = Math.max(0, offset - limit);
  const next = offset + limit;
  return (
    <nav aria-label="Paginación">
      <button type="button" disabled={offset <= 0} onClick={() => onChange(previous)}>
        Anterior
      </button>
      <span>
        {" "}
        {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} de {total}{" "}
      </span>
      <button type="button" disabled={next >= total} onClick={() => onChange(next)}>
        Siguiente
      </button>
    </nav>
  );
}
