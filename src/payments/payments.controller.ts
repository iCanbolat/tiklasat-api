import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './providers/payments.service';

import { Public } from 'src/auth/decorators/public.decorator';
import { ProviderValidationPipe } from './pipes/provider-validation.pipe';
import { PaymentProvider } from './payments.enum';
import { ThreeDSValidationPipe } from './pipes/threeds-validation.pipe';

import { Request } from 'express';
import { CookieUser } from 'src/auth/decorators/cookie-user.decorator';
import { CheckoutFormRetrieveRequest } from './dto/checkout-retrieve-req.dto';

import { StripeCheckoutDTO } from './dto/stripe/stripe.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('checkout-form-retrieve')
  checkoutFormRetrieve(
    @Req() request: Request,
    @Body() checkoutFormRetrieveRequest: CheckoutFormRetrieveRequest,
    @CookieUser() user?: { sub: string },
  ) {
    if (user) checkoutFormRetrieveRequest.userId = user.sub;

    return this.paymentsService.getCheckoutFormPaymentResult(
      checkoutFormRetrieveRequest,
      request.ip,
    );
  }

  @Public()
  @Post('init-checkout-form')
  async initCheckoutForm(
    @Body(new ProviderValidationPipe())
    checkoutInitDto: StripeCheckoutDTO ,
    @CookieUser() user?: { sub: string },
  ): Promise<{ token?: string; paymentUrl: string }> {
    if (user) checkoutInitDto.userId = user.sub;
    console.log('checkoutInitDto - cookieuser', user);
    console.log('checkoutInitDto:', checkoutInitDto);

    return this.paymentsService.createCheckoutFormSession(checkoutInitDto);
  }

  @Public()
  @Post('init-threeds')
  @UsePipes(ThreeDSValidationPipe)
  initThreeDS(@Body() checkoutInitDto: any): Promise<any> {
    const { provider, ...rest } = checkoutInitDto;
    return this.paymentsService.createThreeDsPaymentSession(provider, rest);
  }

  @Public()
  @Post('refund')
  @UsePipes(ThreeDSValidationPipe)
  createRefund(@Body() refundDto: any): Promise<any> {
    const { provider, ...rest } = refundDto;
    return this.paymentsService.createThreeDsPaymentSession(provider, rest);
  }

  @Public()
  @Post('threeds-retrieve')
  threeDSRetrieve(
    @Body('paymentId') paymentId: string,
    @Body('provider') provider: PaymentProvider,
  ) {
    return this.paymentsService.getThreeDSPaymentResult(provider, paymentId);
  }

  @Public()
  @Post('webhook/:provider')
  handleWebhook(
    @Param('provider') provider: PaymentProvider,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
  ) {
    return this.paymentsService.handleWebhook(provider, req.rawBody, headers);
  }
}
