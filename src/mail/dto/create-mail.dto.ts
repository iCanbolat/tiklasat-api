import { Address } from 'src/common/types';
import {
  IProduct,
  IProductAttributes,
  IProductImages,
} from 'src/products/interfaces';

export class CreateReceiptMailDto {
  email: string;
  total: number | string;
  billingAddress: Address;
  orderId: string;
  shippingAddress: Address;
  items: {
    quantity: number;
    product: IProduct & {
      attributes: IProductAttributes[];
      images: IProductImages[];
    };
  }[];
}
