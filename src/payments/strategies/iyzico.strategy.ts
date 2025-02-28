import { Inject, Injectable } from '@nestjs/common';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';
import * as Iyzipay from 'iyzipay';
import * as crypto from 'crypto';
import { ProductsService } from 'src/products/providers/products.service';

// import Iyzipay from '@codingwithmanny/iyzipay-js';
// import { CheckoutInitDto } from '../dto/init-checkout-form.dto';
// import { IyzicoClient } from '@codingwithmanny/iyzipay-js/_dist/_types/types/config';

@Injectable()
export class IyzicoPaymentStrategy implements PaymentStrategy {
  private iyzipay: Iyzipay;

  constructor(
    @Inject('IyzicoConfig') private readonly iyzicoConfig,
    private readonly productService: ProductsService,
  ) {
    this.iyzipay = new Iyzipay({
      apiKey: this.iyzicoConfig.apiKey,
      secretKey: this.iyzicoConfig.secretKey,
      uri: this.iyzicoConfig.baseUrl,
    });
  }

  async createRefund(refundDto: any): Promise<any> {
    // return new Promise((resolve, reject) => {
    //   this.iyzipay.refund.create(refundDto, (err, result) => {
    //     if (err) reject(err);
    //     else resolve(result);
    //   });
    // });
  }

  async handleWebhook(data: any, headers: any): Promise<any> {
    try {
      console.log('Webhook data received:', data);

      // const isValid = this.verifySignature(data);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }

      switch (data.eventType) {
        case 'payment.success':
          console.log('Payment successful:', data);
          break;
        case 'payment.failure':
          console.log('Payment failed:', data);
          break;
        default:
          console.log('Unhandled event type:', data.eventType);
      }

      return { status: 'success' };
    } catch (error) {
      console.error('Error handling webhook:', error);
      return { status: 'error', message: error.message };
    }
  }

  private verifySignature(
    verificationString: string,
    receivedSignature: string,
  ): boolean {
    const computedHash = crypto
      .createHmac('sha1', this.iyzicoConfig.secretKey)
      .update(verificationString, 'utf8')
      .digest('base64');

    return receivedSignature === computedHash;
  }

  createThreeDsPaymentSession(
    paymentData: Iyzipay.ThreeDSInitializePaymentRequestData,
  ): Promise<Iyzipay.ThreeDSInitializePaymentResult> {
    return new Promise((resolve, reject) => {
      this.iyzipay.threedsInitialize.create(paymentData, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async createCheckoutFormSession(
    checkoutInitDto: Iyzipay.ThreeDSInitializePaymentRequestData,
  ): Promise<{ token: string; paymentUrl: string }> {
    try {
      return new Promise((resolve, reject) => {
        this.iyzipay.checkoutFormInitialize.create(
          checkoutInitDto,
          (err, result) => {
            if (err) reject(err);
            else {
              resolve({
                token: result.token,
                paymentUrl: result.paymentPageUrl,
              });
            }
          },
        );
      });
    } catch (error) {
      console.log(error);
    }
  }

  async getCheckoutFormPaymentResult(token: string): Promise<any> {
    const result: Iyzipay.CheckoutFormRetrieveResult = await new Promise(
      (resolve, reject) => {
        this.iyzipay.checkoutForm.retrieve({ token }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      },
    );

    const basketItems: { id: string; quantity: number }[] = Object.values(
      result.itemTransactions.reduce((acc, item) => {
        if (!acc[item.itemId]) {
          acc[item.itemId] = { id: item.itemId, quantity: 0 };
        }
        acc[item.itemId].quantity += 1;
        return acc;
      }, {}),
    );

    const orderItems = await Promise.all(
      basketItems.map(async (item) => {
        const product = await this.productService.findOne(item.id, {
          select: { product: { id: true, name: true, price: true } },
        });
        return { ...product, quantity: item.quantity };
      }),
    );

    return orderItems;
  }

  async getThreeDSPaymentResult(
    paymentId: string,
  ): Promise<Iyzipay.PaymentResult> {
    return new Promise((resolve, reject) => {
      this.iyzipay.threedsPayment.create({ paymentId }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}
