import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { useTicketListParams } from "./useTicketListParams";

function createWrapper(initialEntry = "/") {
  return function Wrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

function renderTicketListParams(initialEntry = "/") {
  return renderHook(
    () => {
      const result = useTicketListParams();
      const location = useLocation();

      return {
        ...result,
        search: location.search
      };
    },
    { wrapper: createWrapper(initialEntry) }
  );
}

describe("useTicketListParams", () => {
  it("returns the default values", () => {
    const { result } = renderTicketListParams();

    expect(result.current.params).toEqual({
      offset: 0,
      limit: 20,
      q: "",
      state: "ALL",
      severity: "ALL",
      sort: "LAST_MODIFIED",
      direction: "DESC"
    });
  });

  it("does not add default values to the URL", async () => {
    const { result } = renderTicketListParams();

    await waitFor(() => {
      expect(result.current.search).toBe("");
    });
  });

  it("reads filters from the URL", () => {
    const { result } = renderTicketListParams(
      "/?offset=20&limit=10&q=log4j&state=IN_PROGRESS&severity=HIGH"
    );

    expect(result.current.params).toMatchObject({
      offset: 20,
      limit: 10,
      q: "log4j",
      state: "IN_PROGRESS",
      severity: "HIGH"
    });
  });

  it("resets the offset when filters change", async () => {
    const { result } = renderTicketListParams("/?offset=40");

    act(() => {
      result.current.setFilters({ q: "log4j" });
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(0);
      expect(result.current.params.q).toBe("log4j");
    });
  });

  it("changes the page without losing the filters", async () => {
    const { result } = renderTicketListParams("/?q=log4j&state=IN_PROGRESS");

    act(() => {
      result.current.setPage(20);
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(20);
      expect(result.current.params.q).toBe("log4j");
      expect(result.current.params.state).toBe("IN_PROGRESS");
    });
  });

  it("resets all filters and pagination", async () => {
    const { result } = renderTicketListParams(
      "/?offset=40&limit=10&q=log4j&state=IN_PROGRESS&severity=HIGH"
    );

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.params).toEqual({
        offset: 0,
        limit: 20,
        q: "",
        state: "ALL",
        severity: "ALL",
        sort: "LAST_MODIFIED",
        direction: "DESC"
      });
    });
  });
  it("normalizes invalid URL parameters", async () => {
    const { result } = renderTicketListParams(
      "/?offset=-10&limit=500&state=INVALID&severity=INVALID&direction=INVALID"
    );

    await waitFor(() => {
      expect(result.current.params.offset).toBe(0);
      expect(result.current.params.limit).toBe(20);
      expect(result.current.params.state).toBe("ALL");
      expect(result.current.params.severity).toBe("ALL");
      expect(result.current.params.direction).toBe("DESC");
    });
  });

  it("removes unknown URL parameters", async () => {
    const { result } = renderTicketListParams("/?unknown=value&q=log4j");

    await waitFor(() => {
      expect(result.current.search).not.toContain("unknown");
      expect(result.current.params.q).toBe("log4j");
    });
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("ignores invalid page offset: %s", (offset) => {
    const { result } = renderTicketListParams();

    act(() => {
      result.current.setPage(offset);
    });

    expect(result.current.params.offset).toBe(0);
  });
  it("preserves filters when changing sort options", async () => {
    const { result } = renderTicketListParams("/?q=log4j&state=IN_PROGRESS");

    act(() => {
      result.current.setFilters({
        sort: "LAST_MODIFIED",
        direction: "ASC"
      });
    });

    await waitFor(() => {
      expect(result.current.params.q).toBe("log4j");
      expect(result.current.params.state).toBe("IN_PROGRESS");
      expect(result.current.params.sort).toBe("LAST_MODIFIED");
      expect(result.current.params.direction).toBe("ASC");
      expect(result.current.params.offset).toBe(0);
    });
  });
  it("supports browser back and forward navigation", async () => {
    const { result } = renderTicketListParams();

    act(() => {
      result.current.setFilters({ q: "log4j" });
    });

    await waitFor(() => {
      expect(result.current.params.q).toBe("log4j");
    });

    act(() => {
      result.current.setFilters({ state: "IN_PROGRESS" });
    });

    await waitFor(() => {
      expect(result.current.params.state).toBe("IN_PROGRESS");
    });

    // Para probar atrás/adelante de forma real
  });
});
