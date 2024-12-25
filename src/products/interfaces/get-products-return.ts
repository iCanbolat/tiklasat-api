export type PaginatedResults<T> = {
  data: T[];
  pagination: {
    totalRecords: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type ProductPaginatedResults = PaginatedResults<ProductWithVariants>;

export interface ProductWithVariants {
    product: IProduct;
    variants?: IProductVariant[]; // Variants are optional in case a product has none
  }

export interface IProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  isFeatured: boolean;
  stockQuantity: number;
  description: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductVariant {
  id: string;
  productId: string;
  variantType: string;
  value: string;
  price: number;
  stockQuantity: number;
}
