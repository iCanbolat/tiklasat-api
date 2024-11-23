import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { HashingService } from './hashing.service';
import { eq } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from '../dto/sign-up.dto';
import { UserTable } from 'src/database/schemas/users.schema';
import { Response as ExpressResponse } from 'express';
import { UserPayload } from '../interfaces/request-with-user';

@Injectable()
export class AuthService {
  private readonly jwtTtl: number;
  private readonly refreshTokenTtl: number;
  private readonly refreshTokenSecret: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtTtl = parseInt(
      this.configService.getOrThrow<string>('JWT_TOKEN_TTL'),
    );
    this.refreshTokenTtl = parseInt(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL'),
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
  }

  private calculateExpiration(milliseconds: number): Date {
    const date = new Date();
    date.setTime(date.getTime() + milliseconds);
    return date;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const [user] = await this.drizzleService.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    delete user.password;
    return user;
  }

  async signUp(signUpDto: SignUpDto, response: ExpressResponse) {
    const [userWithEmail] = await this.drizzleService.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, signUpDto.email));

    if (userWithEmail) {
      throw new BadRequestException('Email already used');
    }

    const hashedPassword = await this.hashingService.hash(signUpDto.password);
    const [user] = await this.drizzleService.db
      .insert(UserTable)
      .values({
        name: `${signUpDto.firstName} ${signUpDto.lastName}`,
        email: signUpDto.email,
        password: hashedPassword,
      })
      .returning();

    delete user.password;

    this.logger.log(`User ${user.name} has created as ${user.role}.`);

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return await this.generateTokens(payload, response);
  }

  async logout(response: ExpressResponse) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

    return { message: 'Logout successful!' };
  }

  async generateTokens(user: UserPayload, response: ExpressResponse) {
    const expiresAccessTokenCookie = this.calculateExpiration(this.jwtTtl);
    const expiresRefreshTokenCookie = this.calculateExpiration(
      this.refreshTokenTtl,
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: `${this.jwtTtl}ms` },
      ),
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        {
          secret: this.refreshTokenSecret,
          expiresIn: `${this.refreshTokenTtl}ms`,
        },
      ),
    ]);

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      expires: expiresAccessTokenCookie,
    });
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      expires: expiresRefreshTokenCookie,
    });

    console.log('exp_accesscookie', expiresAccessTokenCookie);
    console.log('exp_refresc', expiresRefreshTokenCookie);

    return {
      accessToken,
      refreshToken,
    };
  }
}
