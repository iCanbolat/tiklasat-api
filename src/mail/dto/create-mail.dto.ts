import {
  IProduct,
  IProductAttributes,
  IProductImages,
} from 'src/products/interfaces';

export class CreateReceiptMailDto {
  email: string;
  name: string;
  total: number | string;
  items: {
    quantity: number;
    product: IProduct & {
      attributes: IProductAttributes[];
      images: IProductImages[];
    };
  }[];
}
