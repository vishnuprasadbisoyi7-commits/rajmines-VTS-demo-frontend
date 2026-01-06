import { useCallback, useEffect, useRef, useState } from "react";

export interface NormalizedError {
  message: string;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: NormalizedError | null;
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "An unknown error occurred" };
}

export function useFetch<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  immediate = true
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFn(abortController.signal);

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setState({ data, loading: false, error: null });
      }
    } catch (error) {
      // Ignore errors from aborted requests
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (!abortController.signal.aborted) {
        setState({ data: null, loading: false, error: normalizeError(error) });
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    // Cleanup: abort any in-flight request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  return { ...state, refetch: fetchData };
}
