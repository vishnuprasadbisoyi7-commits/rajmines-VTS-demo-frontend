import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { useCallback } from "react";
import type { ProductModel } from "../types/product.types";

export const useProducts = () => {
  const fetchProducts = useCallback(async (signal: AbortSignal): Promise<ProductModel[]> => {
    const response = await fetch(`${API_URLS.FAKE_STORE}/products`, { signal });
    return response.json();
  }, []);

  const { data: products, loading, error } = useFetch<ProductModel[]>(fetchProducts);

  return { products: products ?? [], loading, error };
};

