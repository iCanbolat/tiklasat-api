import { IProduct } from 'src/products/interfaces';

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  parentId?: string;
  productsCount?: number;
}

// export interface IProduct {
//   id: string;
//   name: string;
//   slug: string;
//   imageUrl?: string;
//   categoryId?: string;
// }

export type FindOneCategoryResponseDto = {
  category: ICategory;
  products: IProduct[];
  parentCategories: ICategory[];
  subCategories: ICategory[];
};

export interface ICategoryTree extends ICategory {
  subcategories: ICategoryTree[];
}
