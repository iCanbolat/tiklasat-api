import { Inject, Injectable } from '@nestjs/common';
import {
  BasketItem,
  CheckoutFormResult,
  IProvider,
} from '../interfaces/payment-strategy.interface';
// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';
import * as Iyzipay from 'iyzipay';
import * as crypto from 'crypto';
import { ProductsService } from 'src/products/providers/products.service';
import {
  AddressType,
  AddressTypeEnum,
  IOrderInstanceDto,
} from 'src/common/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from 'src/database/schemas/orders.schema';
import { PaymentCardType } from 'src/database/schemas/payments.schema';
import { OrdersService } from 'src/orders/orders.service';
import { IyzicoStatusEnum, IyzicoWebhookData } from '../interfaces/iyzico.type';
import { CustomerService } from 'src/auth/providers/customer.service';
import { BaseInitCheckoutDto } from '../dto/base-payment.dto';

@Injectable()
export class IyzicoPaymentStrategy implements IProvider {
  private iyzipay: Iyzipay;
  private orderInstanceDto: IOrderInstanceDto = {
    status: OrderStatus.Values.PENDING,
    total: 0,
    buyer: {
      id: '',
      type: 'user',
      name: '',
      email: '',
      phone: '',
    },
    address: [],
    items: [],
    conversationId: '',
  };

  constructor(
    @Inject('IyzicoConfig') private readonly iyzicoConfig,
    private readonly productService: ProductsService,
    private readonly orderService: OrdersService,
    private customerService: CustomerService,

    private eventEmitter: EventEmitter2,
  ) {
    this.iyzipay = new Iyzipay({
      apiKey: this.iyzicoConfig.apiKey,
      secretKey: this.iyzicoConfig.secretKey,
      uri: this.iyzicoConfig.baseUrl,
    });
  }
  getOrderData(token: string): Promise<any> {
    throw new Error('Method not implemented.');
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
      console.log('headers:', headers);
      const webhookData: IyzicoWebhookData = JSON.parse(data.toString('utf-8'));

      // const isValid = this.verifySignature(data);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }

      switch (webhookData.status) {
        case IyzicoStatusEnum.SUCCESS:
          this.eventEmitter.emit('payment.success', {
            orderData: {
              orderNumber: webhookData.paymentConversationId,
              items: this.orderInstanceDto.items,
              address: this.orderInstanceDto.address,
              total: this.orderInstanceDto.total,
              email: this.orderInstanceDto.buyer.email,
              paymentId: webhookData.iyziPaymentId
            },
          });
          console.log('Payment successful:', webhookData.iyziPaymentId);
          break;
        case IyzicoStatusEnum.FAILURE:
          this.eventEmitter.emit('payment.failure', {
            orderData: {
              paymentId: webhookData.iyziPaymentId,
            },
          });
          break;
        default:
          console.log('Unhandled event type:', webhookData.status);
      }

      return { status: 'success' };
    } catch (error) {
      console.error('Error handling webhook:', error);
      return { status: 'error', message: error.message };
    }
  }

  // private verifySignature(
  //   verificationString: string,
  //   receivedSignature: string,
  // ): boolean {
  //   const computedHash = crypto
  //     .createHmac('sha1', this.iyzicoConfig.secretKey)
  //     .update(verificationString, 'utf8')
  //     .digest('base64');

  //   return receivedSignature === computedHash;
  // }

  private verifySignature(
    body: any,
    signature: string,
    secretKey: string,
  ): boolean {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body) + secretKey)
      .digest('hex');

    return hash === signature;
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
    checkoutInitDto: Iyzipay.ThreeDSInitializePaymentRequestData &
      BaseInitCheckoutDto,
    orderNumber: string,
  ): Promise<{ token: string; paymentUrl: string }> {
    const adresses = [
      checkoutInitDto.billingAddress,
      checkoutInitDto.shippingAddress,
    ];

    const formattedAddresses = adresses
      .map((address, idx) => {
        if (!address) return null;

        return {
          id: address.id,
          type: idx === 0 ? AddressTypeEnum.BILLING : AddressTypeEnum.SHIPPING,
          city: address.city,
          country: address.country,
          state: address.state,
          street: address.address,
          zipCode: address.zipCode,
        };
      })
      .filter(Boolean);

    const customer = await this.customerService.findOrCreate({
      email: checkoutInitDto.buyer.email,
      identityNo: checkoutInitDto.buyer.identityNumber,
      userId: checkoutInitDto.userId,
      name: checkoutInitDto.buyer.name,
      phone: checkoutInitDto.buyer.gsmNumber,
    });

    console.log('Customer Created', customer);

    checkoutInitDto.buyer.id = customer.id;
    checkoutInitDto.buyer.identityNumber = customer.identityNo;

    await this.orderService.update(checkoutInitDto.orderId, { customer });

    const { addressStrings } = await this.customerService.prepareAddressData(
      formattedAddresses,
      customer,
      checkoutInitDto.orderId,
    );

    this.orderInstanceDto.billingAddressString = addressStrings.at(0);
    this.orderInstanceDto.shippingAddressString = addressStrings.at(1);

    this.orderInstanceDto.address = formattedAddresses;
    this.orderInstanceDto.buyer = {
      email: checkoutInitDto.buyer.email,
      name: checkoutInitDto.buyer.name + ' ' + checkoutInitDto.buyer.surname,
      phone: checkoutInitDto.buyer.gsmNumber,
      id: customer.id,
      type: customer.type,
    };

    this.orderInstanceDto.conversationId = orderNumber;
    checkoutInitDto.conversationId = orderNumber;

    try {
      return new Promise((resolve, reject) => {
        this.iyzipay.checkoutFormInitialize.create(
          checkoutInitDto,
          (err, result) => {
            if (err) {
              reject(err);
              console.log(err);
            } else {
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

  async getCheckoutFormPaymentResult(
    token: string,
  ): Promise<CheckoutFormResult> {
    const result: Iyzipay.CheckoutFormRetrieveResult = await new Promise(
      (resolve, reject) => {
        this.iyzipay.checkoutForm.retrieve({ token }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      },
    );

    return this.buildSessionResponse(result);
  }

  private async buildSessionResponse(
    result: Iyzipay.CheckoutFormRetrieveResult,
  ): Promise<CheckoutFormResult> {
    const basketItems: BasketItem[] = Object.values(
      result.itemTransactions.reduce((acc, item) => {
        if (!acc[item.itemId]) {
          acc[item.itemId] = { productId: item.itemId, quantity: 0 };
        }
        acc[item.itemId].quantity += 1;
        return acc;
      }, {}),
    );

    const orderItems = await Promise.all(
      basketItems.map(async (item) => {
        const product = await this.productService.findOne(item.productId, {
          select: { product: { id: true, name: true, price: true } },
          includeRelatedProducts: false,
        });
        return {
          ...product,
          quantity: item.quantity,
          price: product.product.price * item.quantity,
        };
      }),
    );

    this.orderInstanceDto.total = result.paidPrice;
    this.orderInstanceDto.items = orderItems;

    return {
      buyer: this.orderInstanceDto.buyer,
      billingAddress: this.orderInstanceDto.billingAddressString,
      shippingAddress: this.orderInstanceDto.shippingAddressString,
      total: result.paidPrice,
      cardFamily: result.cardFamily,
      cardType: result.cardType as PaymentCardType,
      installments: result.installment,
      lastFourDigits: result.lastFourDigits,
      paymentId: result.paymentId,
      addresses: this.orderInstanceDto.address,
      items: basketItems,
      orderNumber: this.orderInstanceDto.conversationId,
    };
  }

  async getThreeDSPaymentResult(paymentId: string): Promise<any> {
    const result = await new Promise((resolve, reject) => {
      this.iyzipay.threedsPayment.create({ paymentId }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return this.buildSessionResponse(result as any);
  }
}
