import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PaymentProvider } from '../payments.enum';
import { IyzicoThreeDSPaymentDto } from '../dto/iyzico/iyzico-threeds-payment.dto';
import { StripeThreeDsPaymentDto } from '../dto/stripe/stripe-threeds.payment.dto';

@Injectable()
export class ThreeDSValidationPipe implements PipeTransform {
  async transform(value: any) {
    if (!value.provider) {
      throw new BadRequestException('Provider is required');
    }

    let dtoClass;
    switch (value.provider) {
      case PaymentProvider.IYZICO:
        dtoClass = IyzicoThreeDSPaymentDto;
        break;
      case PaymentProvider.STRIPE:
        dtoClass = StripeThreeDsPaymentDto;
        break;

      default:
        throw new BadRequestException(
          `Invalid payment provider: ${value.provider}`,
        );
    }

    const object = plainToInstance(dtoClass, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return object;
  }
}
