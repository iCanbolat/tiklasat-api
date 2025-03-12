import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export const GetUserId = createParamDecorator(
  (_, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const cookies = request.cookies;

    if (!cookies || !cookies.access_token) {
      throw new UnauthorizedException('Access token not found in cookies');
    }

    try {
      const decodedToken: any = jwt.verify(
        cookies.access_token,
        process.env.JWT_SECRET,
      );
      return decodedToken.sub;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  },
);
