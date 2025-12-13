import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { useCallback } from "react";
import type { ProductModel } from "../types/product.types";

export const useProducts = () => {
  const fetchProducts = useCallback(async (): Promise<ProductModel[]> => {
    const response = await fetch(`${API_URLS.FAKE_STORE}/products`);
    return response.json();
  }, []);

  const { data: products, loading, error, refetch } = useFetch<ProductModel[]>(fetchProducts);

  return { products: products ?? [], loading, error, refetch };
};
