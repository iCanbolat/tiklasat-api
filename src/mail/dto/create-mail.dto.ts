export class CreateReceiptMailDto {
  email: string;
  name: string;
  items: {
    name: string;
    quantity: number;
    price: string;
  }[];
  total: number;
}
