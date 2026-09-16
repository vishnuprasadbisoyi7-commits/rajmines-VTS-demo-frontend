import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { httpService } from "@shared/services/http.service";
import { useCallback } from "react";
import type { ProductModel } from "../types/product.types";

export const useProducts = () => {
  const fetchProducts = useCallback(async (signal: AbortSignal): Promise<ProductModel[]> => {
    return httpService.get<ProductModel[]>(`${API_URLS.FAKE_STORE}/products`, { signal });
  }, []);

  const { data: products, loading, error } = useFetch<ProductModel[]>(fetchProducts);

  return { products: products ?? [], loading, error };
};
