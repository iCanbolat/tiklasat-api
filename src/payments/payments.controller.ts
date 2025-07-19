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
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './providers/payments.service';
// import { UpdatePaymentDto } from './dto/update-payment.dto';
// import { CheckoutInitDto } from './dto/init-checkout-form.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ProviderValidationPipe } from './pipes/provider-validation.pipe';
import { PaymentProvider } from './payments.enum';
import { ThreeDSValidationPipe } from './pipes/threeds-validation.pipe';
import { StripeRefundDto } from './dto/stripe/stripe-refund.dto';
import { Request } from 'express';
import { CookieUser } from 'src/auth/decorators/cookie-user.decorator';
import { CheckoutFormRetrieveRequest } from './dto/checkout-retrieve-req.dto';
import { BaseInitCheckoutDto } from './dto/base-payment.dto';
import { StripeInitCheckoutDto } from './dto/stripe/stripe-init-checkout.dto';
import { IyzicoInitCheckoutDto } from './dto/iyzico/iyzico-init-checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('checkout-form-retrieve')
  checkoutFormRetrieve(
    @Req() request: Request,
    @Body() checkoutFormRetrieveRequest: CheckoutFormRetrieveRequest,
    @CookieUser() user?: { id: string },
  ) {
    if (user) checkoutFormRetrieveRequest.userId = user.id;

    return this.paymentsService.getCheckoutFormPaymentResult(
      checkoutFormRetrieveRequest,
      request.ip,
    );
  }

  @Public()
  @Post('init-checkout-form')
  initCheckoutForm(
    @Body(new ProviderValidationPipe())
    checkoutInitDto: StripeInitCheckoutDto & IyzicoInitCheckoutDto,
    @CookieUser() user?: { id: string },
  ): Promise<{ token?: string; paymentUrl: string }> {
    if (user) checkoutInitDto.userId = user.id;

    return this.paymentsService.createCheckoutFormSession(
      checkoutInitDto.provider,
      checkoutInitDto,
    );
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
