export interface IProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  isFeatured: boolean;
  isVariant: boolean;
  parentId: string;
  stockQuantity: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductImages {
  id?: string;
  productId?: string;
  url: string;
}

export interface IProductAttributes {
  id?: string;
  variantType: string;
  value: string;
}

export type ProductServiceResponse = {
  product: IProduct;
  attributes?: IProductAttributes[];
  images?: IProductImages[];
};

export type ProductResponseDto = {
  product: IProduct & {
    attributes: IProductAttributes[];
    images: IProductImages[];
  };
  variants: IProduct[];
};

export type FindAllProductsReturnDto = Omit<ProductResponseDto, 'variants'>;
