import { API_URLS } from "@shared/constants";
import { useFetch } from "@shared/hooks";
import { useCallback } from "react";
import type { PostModel } from "../types/post.types";

export const usePost = () => {
  const fetchPosts = useCallback(async (): Promise<PostModel[]> => {
    const response = await fetch(`${API_URLS.JSON_PLACEHOLDER}/posts`);
    return response.json();
  }, []);

  const { data: posts, loading, error, refetch } = useFetch<PostModel[]>(fetchPosts);

  return { posts: posts ?? [], loading, error, refetch };
};
