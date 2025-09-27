import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CustomerService } from '../providers/customer.service';
import { Public } from '../decorators/public.decorator';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { AddressDto } from '../dto/customer/create-address.dto';
import { CookieUser } from '../decorators/cookie-user.decorator';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('addresses')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get customer addresses',
    description: 'Retrieve all saved addresses for the authenticated customer',
  })
  @ApiOkResponse({
    description: 'Customer addresses retrieved successfully',
  })
  async getCustomerAddresses(@CookieUser() user: { id: string }) {
    return await this.customerService.getCustomerAddresses(user.id);
  }

  @Get('profile')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get customer profile with loyalty points',
    description:
      'Retrieve customer profile including loyalty points and order history',
  })
  @ApiOkResponse({
    description: 'Customer profile retrieved successfully',
  })
  async getCustomerProfile(@CookieUser() user: { id: string }) {
    return await this.customerService.findOne(user.id, 'user', {
      includeUser: true,
      includeAddresses: true,
      includeOrders: true,
    });
  }

  @Post('address')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create address for customer',
    description:
      'This endpoint allows a user to create a new billing/shipping address',
  })
  @ApiBody({ type: AddressDto, description: 'Address details' })
  @ApiOkResponse({
    description: 'Address created successfully',
  })
  async createAddress(
    @Body() addressDto: AddressDto,
    @CookieUser() user: { id: string },
  ) {
    const customer = {
      id: user.id,
      type: 'user' as const,
      name: '',
      email: '',
      phone: '',
      identityNo: '',
    };

    // Create a temporary order ID for address creation (you might want to handle this differently)
    const tempOrderId = 'temp-' + Date.now();

    const addressData = {
      ...addressDto,
      type: addressDto.addressType, // Map addressType to type
      orderId: tempOrderId,
    };

    return await this.customerService.createOrFindAddress(
      addressData,
      customer,
    );
  }

  @Delete('address/:addressId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete customer address',
    description: 'Delete a specific address belonging to the customer',
  })
  @ApiParam({ name: 'addressId', description: 'Address ID to delete' })
  @ApiOkResponse({
    description: 'Address deleted successfully',
  })
  async deleteAddress(
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CookieUser() user: { id: string },
  ) {
    const customer = {
      id: user.id,
      type: 'user' as const,
      name: '',
      email: '',
      phone: '',
      identityNo: '',
    };

    // Verify address belongs to customer before deletion
    const address = await this.customerService.getAddressById(
      addressId,
      customer,
    );
    if (!address) {
      throw new Error('Address not found or does not belong to customer');
    }

    // Delete the address (implement this method in CustomerService)
    return await this.customerService.deleteAddress(addressId, user.id);
  }
}
