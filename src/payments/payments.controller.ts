import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
// import { UpdatePaymentDto } from './dto/update-payment.dto';
// import { CheckoutInitDto } from './dto/init-checkout-form.dto';
import { Public } from 'src/auth/decorators/public.decorator';
 import { ProviderValidationPipe } from './pipes/provider-validation.pipe';
import { PaymentProvider } from './payments.enum';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('checkout-form-retrieve/:provider')
  checkoutFormRetrieve(
    @Param('provider') provider: PaymentProvider,
    @Body('token') token: string,
  ) {
    return this.paymentsService.getCheckoutFormPaymentResult(provider, token);
  }

  @Public()
  @Post('init-checkout-form')
  @UsePipes(ProviderValidationPipe)
  initCheckoutForm(
    @Body() checkoutInitDto: any,
  ): Promise<{ token: string; paymentUrl: string }> {
    return this.paymentsService.initCheckoutForm(
      checkoutInitDto.provider,
      checkoutInitDto,
    );
  }

  @Public()
  @Post('webhook/:provider')
  handleWebhook(
    @Param('provider') provider: PaymentProvider,
    @Body() data: any,
  ) {
    return this.paymentsService.handleWebhook(provider, data);
  }
}
