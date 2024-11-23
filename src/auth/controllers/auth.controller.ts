import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequestWithUser } from '../interfaces/request-with-user';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../providers/auth.service';
import { Public } from '../decorators/public.decorator';
import { SignInDto } from '../dto/sign-in.dto';
import { SignInResponseDto } from '../dto/sign-in-response.dto';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignUpResponseDto } from '../dto/sign-up-response.dto';
import { Response as ExpressResponse } from 'express';
import { RefreshAuthGuard } from '../guards/jwt-refresh-guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Sign in a user',
    description:
      'This endpoint allows a user to sign in by providing valid credentials. On successful authentication, a token is generated and returned.',
  })
  @ApiBody({ type: SignInDto, description: 'User sign-in credentials' })
  @ApiOkResponse({
    description: 'User successfully logged in',
    type: SignInResponseDto,
  })
  async signIn(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    return await this.authService.generateTokens(request.user, response);
  }

  @Public()
  @Post('sign-up')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Sign up a new user',
    description:
      'This endpoint allows a new user to sign up by providing necessary registration details. On successful registration, user details are returned.',
  })
  @ApiBody({ type: SignUpDto, description: 'User sign-up details' })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: SignUpResponseDto,
  })
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    return await this.authService.signUp(signUpDto, response);
  }

  
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate new tokens if valid refresh token',
  })
  async refresh(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    return await this.authService.generateTokens(request.user, response);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Log out user',
  })
  @ApiCreatedResponse({
    description: 'User successfully logged out',
  })
  async logOut(@Res({ passthrough: true }) response: ExpressResponse) {
    return this.authService.logout(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'This endpoint returns the current authenticated user.',
  })
  @ApiOkResponse({
    description: 'Current user details',
  })
  async getMe(@Req() request: RequestWithUser) {
    return request.user;
  }
}
