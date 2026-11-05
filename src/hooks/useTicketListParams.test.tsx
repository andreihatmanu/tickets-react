import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { useTicketListParams } from "./useTicketListParams";

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe("useTicketListParams", () => {
  it("returns defaults when the URL has no list parameters", () => {
    const { result } = renderHook(() => useTicketListParams(), {
      wrapper: createWrapper("/tickets")
    });

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

  it("normalizes invalid values and replaces the malformed URL", async () => {
    const { result } = renderHook(
      () => {
        const ticketParams = useTicketListParams();
        const location = useLocation();
        return { ...ticketParams, search: location.search };
      },
      {
        wrapper: createWrapper("/tickets?offset=-5&limit=9999&state=FOO&sort=NOPE&direction=ASC")
      }
    );

    expect(result.current.params).toMatchObject({
      offset: 0,
      limit: 20,
      state: "ALL",
      sort: "LAST_MODIFIED",
      direction: "ASC"
    });

    await waitFor(() => {
      expect(result.current.search).toBe("?direction=ASC");
    });
  });

  it("writes non-default filters and resets offset to zero", async () => {
    const { result } = renderHook(
      () => {
        const ticketParams = useTicketListParams();
        const location = useLocation();
        return { ...ticketParams, search: location.search };
      },
      { wrapper: createWrapper("/tickets?offset=40") }
    );

    act(() => {
      result.current.setFilters({ q: "log4j", state: "IN_PROGRESS" });
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(0);
      expect(result.current.params.q).toBe("log4j");
      expect(result.current.params.state).toBe("IN_PROGRESS");
      expect(result.current.search).toContain("q=log4j");
      expect(result.current.search).toContain("state=IN_PROGRESS");
      expect(result.current.search).not.toContain("limit=20");
    });
  });

  it("changes page without changing filters", async () => {
    const { result } = renderHook(
      () => {
        const ticketParams = useTicketListParams();
        const location = useLocation();
        return { ...ticketParams, search: location.search };
      },
      { wrapper: createWrapper("/tickets?q=log4j&state=REPORTED") }
    );

    act(() => {
      result.current.setPage(40);
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(40);
      expect(result.current.params.q).toBe("log4j");
      expect(result.current.params.state).toBe("REPORTED");
    });
  });

  it("reset removes all list parameters", async () => {
    const { result } = renderHook(
      () => {
        const ticketParams = useTicketListParams();
        const location = useLocation();
        return { ...ticketParams, search: location.search };
      },
      { wrapper: createWrapper("/tickets?offset=40&q=log4j&state=DONE") }
    );

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.search).toBe("");
      expect(result.current.params.offset).toBe(0);
      expect(result.current.params.q).toBe("");
      expect(result.current.params.state).toBe("ALL");
      expect(result.current.params.severity).toBe("ALL");
      expect(result.current.params.sort).toBe("LAST_MODIFIED");
      expect(result.current.params.direction).toBe("DESC");
    });
  });

  it("reflects back and forward navigation in the returned params", async () => {
    const { result } = renderHook(
      () => {
        const ticketParams = useTicketListParams();
        const navigate = useNavigate();
        return {
          ...ticketParams,
          back: () => navigate(-1),
          forward: () => navigate(1)
        };
      },
      { wrapper: createWrapper("/tickets") }
    );

    act(() => {
      result.current.setPage(20);
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(20);
    });

    act(() => {
      result.current.back();
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(0);
    });

    act(() => {
      result.current.forward();
    });

    await waitFor(() => {
      expect(result.current.params.offset).toBe(20);
    });
  });
});
