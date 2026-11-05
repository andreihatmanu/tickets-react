import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import {
  SeveritySchema as TicketSeverity,
  TicketState,
} from "../features/tickets/schemas/ticket.schema";

const SORT_OPTIONS = ["TARGET_DATE", "LAST_MODIFIED", "SEVERITY"] as const;
const DIRECTION_OPTIONS = ["ASC", "DESC"] as const;

export type TicketSort = (typeof SORT_OPTIONS)[number];
export type TicketDirection = (typeof DIRECTION_OPTIONS)[number];
export type TicketStateFilter = "ALL" | (typeof TicketState.options)[number];
export type TicketSeverityFilter = "ALL" | (typeof TicketSeverity.options)[number];

export type TicketListParams = {
  offset: number;
  limit: number;
  q: string;
  state: TicketStateFilter;
  severity: TicketSeverityFilter;
  sort: TicketSort;
  direction: TicketDirection;
};

type TicketListFilters = Partial<
  Omit<TicketListParams, "offset" | "limit">
>;

const DEFAULTS: TicketListParams = {
  offset: 0,
  limit: 20,
  q: "",
  state: "ALL",
  severity: "ALL",
  sort: "LAST_MODIFIED",
  direction: "DESC"
};

const MAX_OFFSET = 2_147_483_647;
const MAX_QUERY_LENGTH = 200;

function parseInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fallback;
  }

  return parsed;
}

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return value !== null && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function parseQuery(value: string | null): string {
  if (value === null) return DEFAULTS.q;

  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > MAX_QUERY_LENGTH) {
    return DEFAULTS.q;
  }

  return normalized;
}

function normalizeParams(searchParams: URLSearchParams): TicketListParams {
  const stateValues = ["ALL", ...TicketState.options] as const;
  const severityValues = ["ALL", ...TicketSeverity.options] as const;

  return {
    offset: parseInteger(searchParams.get("offset"), DEFAULTS.offset, 0, MAX_OFFSET),
    limit: parseInteger(searchParams.get("limit"), DEFAULTS.limit, 1, 100),
    q: parseQuery(searchParams.get("q")),
    state: parseEnum(searchParams.get("state"), stateValues, DEFAULTS.state),
    severity: parseEnum(searchParams.get("severity"), severityValues, DEFAULTS.severity),
    sort: parseEnum(searchParams.get("sort"), SORT_OPTIONS, DEFAULTS.sort),
    direction: parseEnum(searchParams.get("direction"), DIRECTION_OPTIONS, DEFAULTS.direction)
  };
}

function serializeParams(params: TicketListParams): URLSearchParams {
  const search = new URLSearchParams();

  if (params.offset !== DEFAULTS.offset) search.set("offset", String(params.offset));
  if (params.limit !== DEFAULTS.limit) search.set("limit", String(params.limit));
  if (params.q !== DEFAULTS.q) search.set("q", params.q);
  if (params.state !== DEFAULTS.state) search.set("state", params.state);
  if (params.severity !== DEFAULTS.severity) search.set("severity", params.severity);
  if (params.sort !== DEFAULTS.sort) search.set("sort", params.sort);
  if (params.direction !== DEFAULTS.direction) search.set("direction", params.direction);

  return search;
}

function searchParamsAreEqual(
  current: URLSearchParams,
  normalized: URLSearchParams
): boolean {
  return current.toString() === normalized.toString();
}

export function useTicketListParams(): {
  params: TicketListParams; // valores ya validados y con defaults 
  setFilters: (patch: Partial<Omit<TicketListParams, "offset" | "limit">>) => void;
  setPage: (offset: number) => void;
  reset: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(
    () => normalizeParams(searchParams),
    [searchParams]
  );

  // Replace malformed/non-canonical URLs so invalid values never persist in the address bar.
  useEffect(() => {
    const normalized = serializeParams(params);

    if (!searchParamsAreEqual(searchParams, normalized)) {
      setSearchParams(normalized, { replace: true });
    }
  }, [params, searchParams, setSearchParams]);

  const setFilters = useCallback(
    (patch: TicketListFilters) => {
      const next: TicketListParams = {
        ...params,
        ...patch,
        offset: 0
      };

      setSearchParams(serializeParams(next));
    },
    [params, setSearchParams]
  );

  const setPage = useCallback(
    (offset: number) => {
      const validOffset =
        Number.isSafeInteger(offset) && offset >= 0 && offset <= MAX_OFFSET
          ? offset
          : DEFAULTS.offset;

      setSearchParams(serializeParams({ ...params, offset: validOffset }));
    },
    [params, setSearchParams]
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { params, setFilters, setPage, reset };
}
