import { ICategory } from 'src/categories/interfaces';
import { ProductStatusType } from 'src/database/schemas/products.schema';

export interface IProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  cost: number;
  currency: string;
  sku: string;
  status: ProductStatusType;
  stockUnderThreshold: number;
  isFeatured: boolean;
  isVariant: boolean;
  parentId: string;
  stockQuantity: number;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  createdAt: Date;
  updatedAt: Date;
}
export type IRelatedProduct = Pick<IProduct, 'id' | 'name' | 'slug' | 'price'>;

export interface IProductImages {
  url: string;
  displayOrder: number;
  cloudinaryId: string;
}

export interface IProductAttributes {
  variantType: string;
  value: string;
}

export type ProductServiceResponse = {
  product: IProduct;
  attributes?: IProductAttributes[];
  images?: IProductImages[];
  category?: ICategory;
};

export type ProductResponseDto = {
  product: IProduct & {
    attributes: IProductAttributes[];
    images: IProductImages[];
    category?: ICategory;
  };
  variants?: IProduct[];
  relatedProducts?: IRelatedProduct[];
};

export type FindAllProductsReturnDto = Omit<ProductResponseDto, 'variants'>;
