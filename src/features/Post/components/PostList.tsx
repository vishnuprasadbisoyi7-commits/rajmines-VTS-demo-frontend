import { usePost } from "@/features/Post/hooks/usePost";
import { EmptyState, Loading } from "@shared/components";
import PostItem from "./PostItem";

export default function PostList() {
  const { posts, loading, error } = usePost();

  if (loading) {
    return <Loading size="lg" />;
  }

  if (error) {
    return (
      <EmptyState title="Error loading posts" description={error.message} />
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No posts found"
        description="There are no posts available at the moment."
      />
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      {posts.map((item) => (
        <PostItem key={item.id} body={item.body} title={item.title} />
      ))}
    </div>
  );
}
