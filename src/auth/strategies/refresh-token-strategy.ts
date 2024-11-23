import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {          
          return req.cookies?.refresh_token || null;
        },
      ]),
      secretOrKey: configService.get('REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    console.log('RefreshTokenPayload:', payload)
    return payload;
  }
}
