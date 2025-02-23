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
import { PaymentsService } from './payments.service';
// import { UpdatePaymentDto } from './dto/update-payment.dto';
// import { CheckoutInitDto } from './dto/init-checkout-form.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ProviderValidationPipe } from './pipes/provider-validation.pipe';
import { PaymentProvider } from './payments.enum';
import { ThreeDSValidationPipe } from './pipes/threeds-validation.pipe';
import { StripeRefundDto } from './dto/stripe/stripe-refund.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('checkout-form-retrieve')
  checkoutFormRetrieve(
    @Body('token') token: string,
    @Body('provider') provider: PaymentProvider,
  ) {
    return this.paymentsService.getCheckoutFormPaymentResult(provider, token);
  }

  @Public()
  @Post('init-checkout-form')
  @UsePipes(ProviderValidationPipe)
  initCheckoutForm(
    @Body() checkoutInitDto: any,
  ): Promise<{ token?: string; paymentUrl: string }> {
    const { provider, ...rest } = checkoutInitDto;
    return this.paymentsService.createCheckoutFormSession(provider, rest);
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
