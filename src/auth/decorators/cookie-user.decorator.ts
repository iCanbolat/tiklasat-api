// src/decorators/cookie-user.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export const CookieUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET,
    });

    const token = request.cookies?.access_token;

    if (!token) {
      // throw new UnauthorizedException('No access token found in cookies');
      return null
    }

    try {
      const user = await jwtService.verifyAsync(token);
      return user;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  },
);
