import { Buyer } from 'src/common/types';

export type CustomerIdentifier = Buyer & {
  userId?: string;
  guestId?: string;
  identityNo?: string;
};

export type CustomerType = 'guest' | 'user';

export type Customer = Omit<CustomerIdentifier, 'guestId' | 'userId'> & {
  id: string;
  type: CustomerType;
  loyaltyPoints?: number;
  totalSpent?: number;
};

