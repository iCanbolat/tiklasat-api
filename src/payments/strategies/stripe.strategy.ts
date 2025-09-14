import { Inject, Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { IProvider } from '../interfaces/payment-strategy.interface';
import Stripe from 'stripe';
import { StripeInitCheckoutDto } from '../dto/stripe/stripe-init-checkout.dto';
import { MailService } from 'src/mail/mail.service';
import { StripeRefundDto } from '../dto/stripe/stripe-refund.dto';
import { OrdersService } from 'src/orders/orders.service';
import { CustomerService } from 'src/auth/providers/customer.service';
import { DrizzleService } from 'src/database/drizzle.service';
import { BaseInitCheckoutDto } from '../dto/base-payment.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OrderItem, Address } from 'src/common/types';

@Injectable()
export class StripePaymentStrategy implements IProvider {
  private readonly logger = new Logger(StripePaymentStrategy.name);
  private stripe: Stripe;

  constructor(
    @Inject('StripeConfig') private readonly stripeConfig,
    private readonly orderService: OrdersService,
    private readonly customerService: CustomerService,
    private readonly drizzleService: DrizzleService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.stripe = new Stripe(this.stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  async createRefund(refundDto: StripeRefundDto): Promise<any> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: refundDto.paymentIntentId,
      });

      this.logger.log(
        `Refund created successfully for payment intent ${refundDto.paymentIntentId}`,
      );
      return refund;
    } catch (error) {
      this.logger.error(
        `Failed to create refund for payment intent ${refundDto.paymentIntentId}`,
        error,
      );
      throw error;
    }
  }

  // Unified method to get order data (cached or fresh) for all use cases
  async populateOrderData(orderId: string): Promise<{
    lineItems: any[];
    calculatedTotal: number;
    orderItems: OrderItem[];
  } | null> {
    // Cache key for order data
    const cacheKey = `order-data:${orderId}`;

    // Try to get from cache first
    const cachedOrderData = (await this.cacheManager.get(cacheKey)) as any;
    if (cachedOrderData) {
      console.log('📦 Using cached order data for:', orderId);
      return cachedOrderData;
    }

    console.log('🔄 Fetching fresh order data for:', orderId);

    // Get detailed order with items
    const orderWithItems = await this.orderService.findOne(orderId);

    // Validate order has items
    if (!orderWithItems.orderItems || orderWithItems.orderItems.length === 0) {
      throw new Error('Order has no items.');
    }

    // Calculate total from order items
    const calculatedTotal = orderWithItems.orderItems.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    // Map order items to Stripe line_items format
    const lineItems = await Promise.all(
      orderWithItems.orderItems.map(async (item) => {
        // Get product with category information for better metadata
        const productWithCategory =
          await this.drizzleService.db.query.products.findFirst({
            where: (product, { eq }) => eq(product.id, item.product.id),
            with: {
              categories: {
                with: {
                  category: true,
                },
              },
            },
          });

        const primaryCategory =
          productWithCategory?.categories?.[0]?.category?.name || 'General';

        return {
          price_data: {
            currency: 'usd', // You might want to make this configurable
            product_data: {
              name: item.product.name,
              description: `Category: ${primaryCategory}`,
              // You can add product images here if available
              // images: item.product.images ? [item.product.images[0]] : undefined,
            },
            unit_amount: Math.round(item.product.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
      }),
    );

    const orderData = {
      lineItems,
      calculatedTotal,
      orderItems: orderWithItems.orderItems,
    };

    // Cache the order data for 30 minutes
    await this.cacheManager.set(cacheKey, orderData, 1800);
    console.log('💾 Cached order data for:', orderId);

    return orderData;
  }

  getThreeDSPaymentResult(token: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async handleWebhook(
    data: Buffer<ArrayBufferLike>,
    headers: Headers,
  ): Promise<any> {
    const signature = headers['stripe-signature'];

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        data,
        signature,
        this.stripeConfig.webhookSecret ||
          'whsec_ff8188bdb0a593efdf9e6992affbc1b071f2440ec65672b458931461e810df12',
      );
    } catch (error) {
      console.log('Error verifying webhook signature:', error);
      return { status: 'error', message: 'Invalid signature' };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Webhook session metadata:', session.metadata);

        let orderItems: OrderItem[] = [];
        if (session.metadata?.orderId) {
          const orderData = await this.populateOrderData(
            session.metadata.orderId,
          );
          if (orderData) {
            orderItems = orderData.orderItems;
            console.log(
              '📦 Order items found for webhook:',
              orderItems.length,
              'items',
            );
          } else {
            console.warn(
              '⚠️ No order data found for orderId:',
              session.metadata.orderId,
            );
          }
        }

        if (session.metadata?.orderNumber) {
          this.eventEmitter.emit('payment.success', {
            orderData: {
              orderNumber: session.metadata.orderNumber,
              items: orderItems,
              address: [
                session.customer_details?.address
                  ? `${session.customer_details.address.line1}, ${session.customer_details.address.city}, ${session.customer_details.address.state} ${session.customer_details.address.postal_code}, ${session.customer_details.address.country}`
                  : 'No billing address',
                session.shipping_details?.address
                  ? `${session.shipping_details.address.line1}, ${session.shipping_details.address.line2 || ''}, ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}, ${session.shipping_details.address.country}`
                  : 'No shipping address',
              ].filter(
                (addr) =>
                  addr !== 'No billing address' &&
                  addr !== 'No shipping address',
              ),
              total: session.amount_total ? session.amount_total / 100 : 0,
              email: session.customer_details?.email,
              paymentSessionId: session.payment_intent,
              orderId: session.metadata.orderId,
            },
          });
          console.log(
            `✅ Stripe payment successful for order: ${session.metadata.orderNumber}`,
          );

          // Clear cache for completed order (after emitting event)
          if (session.metadata?.orderId) {
            await this.clearOrderCache(session.metadata.orderId);
          }
        }

        this.logger.log(
          `✅ Payment successful, email sent to ${session.customer_details?.email}`,
        );
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        console.log(`❌ Checkout session expired: ${expiredSession.id}`);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { status: 'success' };
  }

  async createThreeDsPaymentSession(
    createThreeDsPaymentDto: any,
  ): Promise<any> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: createThreeDsPaymentDto.amount,
      currency: createThreeDsPaymentDto.currency,
      payment_method_types: ['card'],
      confirm: true,
      use_stripe_sdk: true,
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    });
    return paymentIntent.client_secret;
  }

  async createCheckoutFormSession(
    stripeInitCheckoutDto: StripeInitCheckoutDto & BaseInitCheckoutDto,
    orderNumber: string,
  ): Promise<{ token?: string; paymentUrl: string }> {
    // Populate order data (line items, pricing, etc.)
    console.log('previously populated order data:', stripeInitCheckoutDto);

    const orderData = await this.populateOrderData(
      stripeInitCheckoutDto.orderId,
    );

    if (!orderData) {
      throw new Error('Unable to load order data');
    }

    // Set DTO properties from order data
    stripeInitCheckoutDto.line_items = orderData.lineItems;
    stripeInitCheckoutDto.metadata = {
      ...stripeInitCheckoutDto.metadata,
      orderId: stripeInitCheckoutDto.orderId,
      userId: stripeInitCheckoutDto?.userId,
      orderNumber: orderNumber,
    };

    console.log('populated order data:', stripeInitCheckoutDto);

    // Create Stripe checkout session
    const response = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: stripeInitCheckoutDto.success_url,
      cancel_url: stripeInitCheckoutDto.cancel_url,
      line_items: stripeInitCheckoutDto.line_items,
      payment_method_types: stripeInitCheckoutDto.payment_method_types || [
        'card',
      ],
      customer_email: stripeInitCheckoutDto.customer_email,
      metadata: stripeInitCheckoutDto.metadata,
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'TR'],
      },
    });

    return {
      token: response.id,
      paymentUrl: response.url,
    };
  }

  /**
   * Helper method to extract card details from Stripe payment method
   * @param paymentMethod Stripe payment method object
   * @returns Card details formatted for our schema
   */
  private extractCardDetails(paymentMethod: any): {
    cardFamily: string;
    cardType: 'CREDIT_CARD' | 'DEBIT_CARD';
    lastFourDigits: string;
    installments: number;
  } {
    if (!paymentMethod?.card) {
      return {
        cardFamily: 'Unknown',
        cardType: 'CREDIT_CARD',
        lastFourDigits: '0000',
        installments: 1,
      };
    }

    // Map Stripe card brand to readable names
    const brandMapping: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'MasterCard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
      unknown: 'Unknown',
    };

    // Map Stripe funding type to our enum values
    const fundingMapping: Record<string, 'CREDIT_CARD' | 'DEBIT_CARD'> = {
      credit: 'CREDIT_CARD',
      debit: 'DEBIT_CARD',
      prepaid: 'CREDIT_CARD', // Treat prepaid as credit
      unknown: 'CREDIT_CARD', // Default to credit
    };

    return {
      cardFamily: brandMapping[paymentMethod.card.brand] || 'Unknown',
      cardType: fundingMapping[paymentMethod.card.funding] || 'CREDIT_CARD',
      lastFourDigits: paymentMethod.card.last4 || '0000',
      installments: 1, // Stripe doesn't typically use installments, but you could extend this
    };
  }

  async getCheckoutFormPaymentResult(token: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(token, {
      expand: ['line_items', 'customer'],
    });

    const orderId = session.metadata?.orderId;
    let basketItems = [];

    if (orderId) {
      const orderData = await this.populateOrderData(orderId);

      if (orderData && orderData.orderItems) {
        console.log('📦 Using order data for payment result:', orderId);
        // Use the proper OrderItem structure from cache/database
        basketItems = orderData.orderItems.map((item: OrderItem) => ({
          productId: item.product.id,
          quantity: item.quantity,
          name: item.product.name,
          price: item.product.price,
        }));
      }
    }

    // Fallback to line items if no cache
    if (basketItems.length === 0) {
      const lineItems =
        await this.stripe.checkout.sessions.listLineItems(token);
      basketItems = lineItems.data.map((item) => ({
        productId: (item.price?.product as string) || 'unknown',
        quantity: item.quantity || 1,
        name: item.description || 'Unknown Product',
        price: item.amount_total ? item.amount_total / 100 : 0,
      }));
    }

    // Retrieve payment method details if payment intent exists
    let cardDetails = {
      cardFamily: 'Unknown',
      cardType: 'CREDIT_CARD' as any,
      lastFourDigits: '0000',
      installments: 1,
    };

    if (session.payment_intent) {
      try {
        // Get the payment intent with payment method details
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          session.payment_intent as string,
          { expand: ['payment_method'] },
        );

        if (
          paymentIntent.payment_method &&
          typeof paymentIntent.payment_method === 'object'
        ) {
          cardDetails = this.extractCardDetails(paymentIntent.payment_method);
        }
      } catch (error) {
        console.log('Error retrieving payment method details:', error);
      }
    }

    const customer = await this.customerService.findOrCreate({
      email: session.customer_details.email,
      userId: session.metadata.userId,
      name: session.customer_details?.name || 'Unknown',
      phone: session.customer_details?.phone || '',
    });

    const stripeAddresses: Address[] = [];

    if (session.customer_details?.address) {
      stripeAddresses.push({
        type: 'billing' as const,
        street: session.customer_details.address.line1 || '',
        city: session.customer_details.address.city || '',
        state: session.customer_details.address.state || '',
        zipCode: session.customer_details.address.postal_code || '',
        country: session.customer_details.address.country || '',
      });
    }

    if (session.shipping_details?.address) {
      stripeAddresses.push({
        type: 'shipping' as const,
        street: session.shipping_details.address.line1 || '',
        city: session.shipping_details.address.city || '',
        state: session.shipping_details.address.state || '',
        zipCode: session.shipping_details.address.postal_code || '',
        country: session.shipping_details.address.country || '',
      });
    }

    // Create addresses and get their IDs
    const { addressIds } = await this.customerService.prepareAddressData(
      stripeAddresses,
      customer,
      orderId,
    );

    // Update the order with customer information and address IDs
    await this.orderService.update(orderId, {
      customer,
      addressIds, // This will be used to set billingAddressId and shippingAddressId
    });

    // Build buyer information
    const buyer = {
      id: customer.id,
      type: customer.type,
      name: session.customer_details?.name || 'Stripe Customer',
      email: session.customer_details?.email || '',
      phone: session.customer_details?.phone || '',
    };

    // Format addresses
    const billingAddress = session.customer_details?.address
      ? `${session.customer_details.address.line1}, ${session.customer_details.address.city}, ${session.customer_details.address.state} ${session.customer_details.address.postal_code}, ${session.customer_details.address.country}`
      : 'Address not provided';

    const shippingAddress = session.shipping_details?.address
      ? `${session.shipping_details.address.line1}, ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}, ${session.shipping_details.address.country}`
      : billingAddress;

    // Get addresses array (simplified format for response)
    const responseAddresses = [];
    if (session.customer_details?.address) {
      responseAddresses.push({
        id: 'billing',
        type: 'BILLING',
        street: session.customer_details.address.line1 || '',
        city: session.customer_details.address.city || '',
        state: session.customer_details.address.state || '',
        zipCode: session.customer_details.address.postal_code || '',
        country: session.customer_details.address.country || '',
      });
    }

    return {
      buyer,
      billingAddress,
      shippingAddress,
      total: session.amount_total ? session.amount_total / 100 : 0,
      cardFamily: cardDetails.cardFamily,
      cardType: cardDetails.cardType,
      installments: cardDetails.installments,
      lastFourDigits: cardDetails.lastFourDigits,
      paymentId: session.payment_intent as string,
      addresses: responseAddresses,
      items: basketItems,
      orderNumber:
        session.metadata?.orderNumber ||
        session.metadata?.conversationId ||
        'unknown',
    };
  }

  async clearOrderCache(orderId: string): Promise<void> {
    const cacheKey = `order-data:${orderId}`;
    await this.cacheManager.del(cacheKey);
    console.log('🗑️ Cleared cache for completed order:', orderId);
  }
}
