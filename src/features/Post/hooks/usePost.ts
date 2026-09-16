import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { httpService } from "@shared/services/http.service";
import { useCallback } from "react";
import type { PostModel } from "../types/post.types";

export const usePost = () => {
  const fetchPosts = useCallback(async (signal: AbortSignal): Promise<PostModel[]> => {
    return httpService.get<PostModel[]>(`${API_URLS.JSON_PLACEHOLDER}/posts`, { signal });
  }, []);

  const { data: posts, loading, error } = useFetch<PostModel[]>(fetchPosts);

  return { posts: posts ?? [], loading, error };
};
