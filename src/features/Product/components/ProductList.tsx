import { EmptyState, Loading } from "@shared/components";
import { useProducts } from "../hooks/useProducts";
import ProductItem from "./ProductItem";

export default function ProductList() {
  const { products, loading, error } = useProducts();

  if (loading) {
    return <Loading size="lg" />;
  }

  if (error) {
    return (
      <EmptyState title="Error loading products" description={error.message} />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="There are no products available at the moment."
      />
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </div>
  );
}
