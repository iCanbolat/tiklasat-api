import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { StripeInitCheckoutDto } from '../dto/stripe/stripe-init-checkout.dto';
import { IyzicoInitCheckoutDto } from '../dto/iyzico/iyzico-init-checkout.dto';
import { PaymentProvider } from '../payments.enum';
import { StripeCheckoutDTO } from '../dto/stripe/stripe.dto';

@Injectable()
export class ProviderValidationPipe implements PipeTransform {
  async transform(value: any) {
    if (!value?.provider) {
      throw new BadRequestException('Provider is required');
    }

    let dtoClass;
    switch (value.provider) {
      case PaymentProvider.IYZICO:
        dtoClass = IyzicoInitCheckoutDto;
        break;
      case PaymentProvider.STRIPE:
        dtoClass = StripeCheckoutDTO;
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
