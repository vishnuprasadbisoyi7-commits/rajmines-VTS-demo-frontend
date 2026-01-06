import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { useCallback } from "react";
import type { PostModel } from "../types/post.types";

export const usePost = () => {
  const fetchPosts = useCallback(async (signal: AbortSignal): Promise<PostModel[]> => {
    const response = await fetch(`${API_URLS.JSON_PLACEHOLDER}/posts`, { signal });
    return response.json();
  }, []);

  const { data: posts, loading, error } = useFetch<PostModel[]>(fetchPosts);

  return { posts: posts ?? [], loading, error };
};

