import { Request } from 'express';
import { UserRoleType } from 'src/database/schemas/users.schema';

export type UserPayload = {
  id: string;
  email: string;
  role: UserRoleType
};

export interface RequestWithUser extends Request {
  user: UserPayload;
}
