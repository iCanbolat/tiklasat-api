import { Buyer } from 'src/common/types';

export type CustomerIdentifier = {
  userId?: string;
  guestId?: string;
  email: string;
  phone: string;
  name?: string;
};

export type CustomerType = 'guest' | 'user';

export type Customer = Omit<Buyer, 'name'> & {
  id: string;
  type: CustomerType;
};
