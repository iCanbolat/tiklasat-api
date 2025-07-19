import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CustomerService } from '../providers/customer.service';
import { Public } from '../decorators/public.decorator';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AddressDto } from '../dto/customer/create-address.dto';
import { CookieUser } from '../decorators/cookie-user.decorator';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('address')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create address details of user',
    description:
      'This endpoint allows a user to create billing/shipping address on CustomerTable. On successful insertion, a token is generated and returned.',
  })
  // @ApiBody({ type: SignInDto, description: 'User sign-in credentials' })
  // @ApiOkResponse({
  //   description: 'User successfully logged in',
  //   type: SignInResponseDto,
  // })
  async createAddress(
    @Body() addressDto: AddressDto,
    @CookieUser() user: { id: string },
  ) {
    // return await this.customerService.createCustomerAddress(addressDto, user.id);
  }
}
