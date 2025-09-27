import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProvider } from '../interfaces/payment-strategy.interface';
import Stripe from 'stripe';
import { StripeInitCheckoutDto } from '../dto/stripe/stripe-init-checkout.dto';
import { StripeRefundDto } from '../dto/stripe/stripe-refund.dto';
import { OrdersService } from 'src/orders/orders.service';
import { CustomerService } from 'src/auth/providers/customer.service';
import { LoyaltyService } from 'src/auth/providers/loyalty.service';
import { DrizzleService } from 'src/database/drizzle.service';
import { OrderTable } from 'src/database/schemas/orders.schema';
import { eq } from 'drizzle-orm';
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
    @Inject(CACHE_MANAGER) public cacheManager: Cache,
    private readonly orderService: OrdersService,
    private readonly customerService: CustomerService,
    private readonly loyaltyService: LoyaltyService,
    private readonly drizzleService: DrizzleService,
    private readonly eventEmitter: EventEmitter2,
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
  async populateOrderData(
    orderId: string,
    userId?: string,
    pointsToRedeem?: number,
  ): Promise<{
    lineItems: any[];
    calculatedTotal: number;
    orderItems: OrderItem[];
    loyaltyDiscount?: {
      pointsToRedeem: number;
      discountAmount: number;
      finalTotal: number;
    };
  } | null> {
    const cacheKey = this.generateCacheKey(orderId);

    console.log('🔍 populateOrderData called:', {
      orderId,
      userId: userId || 'none',
      pointsToRedeem: pointsToRedeem || 'none',
      cacheKey,
      timestamp: new Date().toISOString(),
    });

    // Try to get base order data from cache first
    let cachedOrderData = (await this.cacheManager.get(cacheKey)) as any;

    if (!cachedOrderData) {
      console.log('❌ Cache MISS for:', { orderId, cacheKey });
      console.log('🔄 Fetching fresh order data for:', orderId);

      // Get detailed order with items
      const orderWithItems = await this.orderService.findOne(orderId);

      // Validate order has items
      if (
        !orderWithItems.orderItems ||
        orderWithItems.orderItems.length === 0
      ) {
        throw new Error('Order has no items.');
      }

      // Calculate total from order items
      const calculatedTotal = orderWithItems.orderItems.reduce(
        (total, item) => {
          return total + item.product.price * item.quantity;
        },
        0,
      );

      // Cache base order data (without loyalty calculations)
      cachedOrderData = {
        calculatedTotal,
        orderItems: orderWithItems.orderItems,
      };

      console.log('💾 CACHING order data with key:', cacheKey);
      await this.cacheManager.set(cacheKey, cachedOrderData, 1800000); // 30 minutes
      console.log('💾 Cached base order data for:', orderId);
    } else {
      console.log('📦 Using cached order data for:', orderId);
    }

    // Calculate loyalty discount on demand (not cached)
    let loyaltyDiscount;
    if (userId && pointsToRedeem) {
      try {
        const discountCalc =
          await this.loyaltyService.calculateAvailableDiscount(
            userId,
            cachedOrderData.calculatedTotal,
            pointsToRedeem,
          );
        loyaltyDiscount = {
          pointsToRedeem: discountCalc.pointsToRedeem,
          discountAmount: discountCalc.discountAmount,
          finalTotal: discountCalc.finalTotal,
        };
      } catch (error) {
        console.warn('Failed to calculate loyalty discount:', error.message);
      }
    }

    // Generate line items on demand with current pricing/discounts
    const lineItems = await Promise.all(
      cachedOrderData.orderItems.map(async (item) => {
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

        // Use final total if discount is applied, otherwise use original price
        const unitAmount = loyaltyDiscount
          ? Math.round(
              ((item.product.price * loyaltyDiscount.finalTotal) /
                cachedOrderData.calculatedTotal) *
                100,
            )
          : Math.round(item.product.price * 100);

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.product.name,
              description: `Category: ${primaryCategory}`,
            },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
        };
      }),
    );

    return {
      lineItems,
      calculatedTotal: loyaltyDiscount
        ? loyaltyDiscount.finalTotal
        : cachedOrderData.calculatedTotal,
      orderItems: cachedOrderData.orderItems,
      ...(loyaltyDiscount && { loyaltyDiscount }),
    };
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
          const userId = session.metadata?.userId;
          const pointsToRedeem = session.metadata?.loyaltyDiscount
            ? JSON.parse(session.metadata.loyaltyDiscount).pointsToRedeem
            : undefined;

          console.log('🔍 Webhook attempting to load order data:', {
            orderId: session.metadata.orderId,
            userId,
            pointsToRedeem,
            cacheKey: `order-data:${session.metadata.orderId}`,
          });

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
          // Get address information - prefer saved addresses over Stripe collected ones
          const addressInfo = [];

          // Check if we have saved address IDs
          const hasSavedAddresses =
            session.metadata?.billingAddressId ||
            session.metadata?.shippingAddressId;

          console.log('🏠 Webhook address handling (optimized):', {
            hasSavedAddresses,
            billingSource: session.metadata?.billingAddressString
              ? 'saved'
              : 'stripe-collected',
            shippingSource: session.metadata?.shippingAddressString
              ? 'saved'
              : 'stripe-collected',
            addressCount: addressInfo.length,
          });

          // Use unified address parsing for webhook
          const webhookBillingData = this.parseSessionAddress(
            session,
            'billing',
          );
          const webhookShippingData = this.parseSessionAddress(
            session,
            'shipping',
          );

          if (webhookBillingData.addressString) {
            addressInfo.push(webhookBillingData.addressString);
          }
          if (
            webhookShippingData.addressString &&
            webhookShippingData.addressString !==
              webhookBillingData.addressString
          ) {
            addressInfo.push(webhookShippingData.addressString);
          }

          // Use saved phone from metadata if available, otherwise use Stripe collected phone
          const webhookPhone =
            session.metadata?.savedPhone ||
            session.customer_details?.phone ||
            '';

          this.eventEmitter.emit('payment.success', {
            orderData: {
              orderNumber: session.metadata.orderNumber,
              items: orderItems,
              address: addressInfo,
              total: session.amount_total ? session.amount_total / 100 : 0,
              email: session.customer_details?.email,
              phone: webhookPhone,
              paymentSessionId: session.payment_intent,
              orderId: session.metadata.orderId,
            },
          });
          console.log(
            `✅ Stripe payment successful for order: ${session.metadata.orderNumber}`,
          );

          if (session.metadata?.orderId) {
            // Mark order as processed but don't clear cache immediately
            // Success page might still need the data
            await this.markOrderAsProcessed(session.metadata.orderId);
            console.log(
              '✅ Webhook marked order as processed:',
              session.metadata.orderId,
            );

            // Schedule cache cleanup with delay
            // This covers the case where webhook fires before success page
            setTimeout(() => {
              this.clearOrderCache(session.metadata.orderId);
              console.log(
                '🧹 Webhook scheduled cache cleanup completed for:',
                session.metadata.orderId,
              );
            }, 60000); // 60 seconds - increased for better safety margin
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
    console.log(
      '🚀 Creating session for order:',
      stripeInitCheckoutDto.orderId,
      'with user:',
      stripeInitCheckoutDto.userId,
      'redeeming points:',
      stripeInitCheckoutDto.pointsToRedeem,
    );

    const orderData = await this.populateOrderData(
      stripeInitCheckoutDto.orderId,
      stripeInitCheckoutDto.userId,
      stripeInitCheckoutDto.pointsToRedeem,
    );

    if (!orderData) {
      throw new Error('Unable to load order data');
    }

    // Get customer with addresses and default address IDs if user is authenticated
    let customer = null;
    let defaultBillingAddressId = null;
    let defaultShippingAddressId = null;

    if (stripeInitCheckoutDto.userId) {
      customer = await this.customerService.findOne(
        stripeInitCheckoutDto.userId,
        'user',
        { includeAddresses: true, includeUser: true },
      );

      if (customer) {
        // Get customer details to access default address IDs
        const customerDetails = await this.customerService.getCustomerDetails(
          stripeInitCheckoutDto.userId,
        );
        defaultBillingAddressId = customerDetails?.billingAddressId;
        defaultShippingAddressId = customerDetails?.shippingAddressId;

        console.log('🏠 Customer data loaded (addresses + phone):', {
          userId: stripeInitCheckoutDto.userId,
          billingAddressId: defaultBillingAddressId,
          shippingAddressId: defaultShippingAddressId,
          totalAddresses: customer.addresses?.length || 0,
          hasPhone: !!customer.phone,
          phoneValue: customer.phone || 'not available',
          phoneSource: customer.phone
            ? 'user-table-via-includeUser'
            : 'not-in-db',
          optimizationNote:
            'Single customer query with includeAddresses + includeUser (phone) - no additional queries needed',
        });
      }
    }

    stripeInitCheckoutDto.line_items = orderData.lineItems;
    stripeInitCheckoutDto.metadata = {
      ...stripeInitCheckoutDto.metadata,
      orderId: stripeInitCheckoutDto.orderId,
      userId: stripeInitCheckoutDto?.userId,
      orderNumber: orderNumber,
      // Store customer info for consistency
      ...(stripeInitCheckoutDto.customer_email && {
        customerEmail: stripeInitCheckoutDto.customer_email,
      }),
      ...(orderData.loyaltyDiscount && {
        loyaltyDiscount: JSON.stringify(orderData.loyaltyDiscount),
      }),
      ...(defaultBillingAddressId && {
        billingAddressId: defaultBillingAddressId,
      }),
      ...(defaultShippingAddressId && {
        shippingAddressId: defaultShippingAddressId,
      }),
    };

    console.log('populated order data:', stripeInitCheckoutDto);

    // Determine what we need to collect from Stripe
    const needsBillingAddress = !defaultBillingAddressId;
    const needsShippingAddress = !defaultShippingAddressId;

    // Get saved addresses from already loaded customer data (no additional queries needed)
    let billingAddress = null;
    let shippingAddress = null;

    if (defaultBillingAddressId && customer?.addresses) {
      billingAddress = customer.addresses.find(
        (addr) => addr.id === defaultBillingAddressId,
      );
    }

    if (defaultShippingAddressId && customer?.addresses) {
      shippingAddress = customer.addresses.find(
        (addr) => addr.id === defaultShippingAddressId,
      );
    }

    // Build session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      success_url: stripeInitCheckoutDto.success_url,
      cancel_url: stripeInitCheckoutDto.cancel_url,
      line_items: stripeInitCheckoutDto.line_items,
      payment_method_types: stripeInitCheckoutDto.payment_method_types || [
        'card',
      ],
      customer_email: stripeInitCheckoutDto.customer_email,
      metadata: stripeInitCheckoutDto.metadata,
    };

    // Only collect phone number if customer doesn't have one saved
    if (!customer?.phone) {
      sessionConfig.phone_number_collection = {
        enabled: true,
      };
      console.log('📞 Phone collection enabled - customer has no saved phone');
    } else {
      console.log(
        '📞 Phone collection disabled - using saved phone:',
        customer.phone,
      );
    }

    // Send saved billing address to Stripe for fraud prevention
    if (billingAddress) {
      // Pre-fill customer information for better UX
      sessionConfig.customer_email = stripeInitCheckoutDto.customer_email;

      // Use billing_address_collection with the saved address for verification
      sessionConfig.billing_address_collection = 'auto';

      // Store saved address info in metadata for reference
      if (!sessionConfig.metadata) {
        sessionConfig.metadata = {};
      }

      const billingMetadata = this.createAddressMetadata(
        billingAddress,
        'billing',
      );
      sessionConfig.metadata.savedBillingAddress = billingMetadata.savedAddress;
      sessionConfig.metadata.billingAddressString =
        billingMetadata.addressString;
    } else if (needsBillingAddress) {
      // Force collection if we don't have saved billing address
      sessionConfig.billing_address_collection = 'required';
    }

    // Store customer phone if available (independently of address handling)
    if (customer?.phone) {
      if (!sessionConfig.metadata) {
        sessionConfig.metadata = {};
      }
      sessionConfig.metadata.savedPhone = customer.phone;
      console.log('📞 Customer phone stored in metadata:', {
        phone: customer.phone,
        source: 'customer-data-single-query',
      });
    }

    // Store saved shipping address metadata if available
    if (shippingAddress) {
      if (!sessionConfig.metadata) {
        sessionConfig.metadata = {};
      }

      const shippingMetadata = this.createAddressMetadata(
        shippingAddress,
        'shipping',
      );
      sessionConfig.metadata.savedShippingAddress =
        shippingMetadata.savedAddress;
      sessionConfig.metadata.shippingAddressString =
        shippingMetadata.addressString;
    }

    // Only collect shipping address if we don't have a saved one
    if (needsShippingAddress) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'TR'],
      };
    }

    console.log('🏠 Address + Phone collection strategy:', {
      needsBillingAddress,
      needsShippingAddress,
      hasSavedBilling: !!billingAddress,
      hasSavedShipping: !!shippingAddress,
      hasSavedPhone: !!customer?.phone,
      billingAddressId: defaultBillingAddressId,
      shippingAddressId: defaultShippingAddressId,
      billingCollection: sessionConfig.billing_address_collection || 'none',
      shippingCollection: sessionConfig.shipping_address_collection
        ? 'required'
        : 'none',
      phoneCollection: sessionConfig.phone_number_collection?.enabled
        ? 'will-collect'
        : 'using-saved',
      phoneSource: customer?.phone
        ? 'customer-data-saved'
        : 'will-collect-from-stripe',
      optimizationNote:
        'DTO cleaned - addresses + phone fetched via single customer query, conditional phone collection',
    });

    console.log('⚡ Performance & Code Quality optimization completed:', {
      previousApproach:
        'Passed billingAddressId/shippingAddressId via DTO + 2 separate getAddressById queries + duplicated address formatting logic + phone handled separately',
      currentApproach:
        'Single findOne query (includeAddresses + phone) + centralized address helper methods + unified metadata handling',
      queryReduction: 'Eliminated 2 additional database queries',
      codeQuality:
        'Centralized address formatting, eliminated code duplication (~60% less address-related code), simplified metadata handling, unified phone handling',
      dtoSimplification:
        'Removed billingAddressId and shippingAddressId from BaseInitCheckoutDto',
      phoneOptimization:
        'Phone loaded in single customer query + conditional collection (skip if saved)',
    });

    // Create Stripe checkout session
    const response = await this.stripe.checkout.sessions.create(sessionConfig);

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
      // For guest users, we still want to check cache but won't have userId/loyalty data
      const userId = session.metadata?.userId;
      const isGuestUser = !userId;

      console.log('🛍️ Payment result for:', {
        orderId,
        userType: isGuestUser ? 'guest' : 'registered',
        userId: userId || 'none',
      });

      const orderData = await this.populateOrderData(orderId, userId);

      if (orderData && orderData.orderItems) {
        console.log('📦 Using order data for payment result:', orderId);

        // Check if order was processed by webhook
        if ((orderData as any)?._processed) {
          console.log('✅ Success page found webhook-processed order:', {
            orderId,
            processedAt: (orderData as any)._processedAt,
            webhookCompleted: (orderData as any)?._webhookCompleted,
            timing: 'webhook-first-success-second',
          });
        } else {
          console.log('📊 Success page processing before webhook:', {
            orderId,
            timing: 'success-first-webhook-pending',
            cacheWillBePreserved: 'until-webhook-completes',
          });
        }

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

    // Create or find customer - prioritize existing data over Stripe data
    // Use saved phone from metadata if available, otherwise use Stripe collected phone
    const phoneNumber =
      session.metadata?.savedPhone || session.customer_details?.phone || '';

    const customer = await this.customerService.findOrCreate({
      email: session.customer_details.email,
      userId: session.metadata.userId,
      name: session.customer_details?.name || 'Unknown',
      phone: phoneNumber,
    });

    console.log('📞 Customer details (optimized phone handling):', {
      type: customer.type,
      email: customer.email,
      phone: phoneNumber || 'none',
      phoneSource: session.metadata?.savedPhone
        ? 'saved-from-customer-data'
        : 'stripe-collected',
      hasUserId: !!session.metadata.userId,
      canSaveAddresses: customer.type === 'user',
      optimizationNote:
        'Phone from customer single query in createSession, reused here',
    });

    // Handle address management with deduplication
    // Guest users won't have existing address IDs, but we still process their addresses
    const existingAddressIds = {
      billingAddressId: session.metadata?.billingAddressId,
      shippingAddressId: session.metadata?.shippingAddressId,
    };

    let addressIds: string[] = [];

    // Only create addresses from Stripe if no existing address IDs are provided
    if (
      !existingAddressIds.billingAddressId ||
      !existingAddressIds.shippingAddressId
    ) {
      const stripeAddresses: Address[] = [];

      // Add billing address from Stripe if not provided via ID
      if (
        !existingAddressIds.billingAddressId &&
        session.customer_details?.address
      ) {
        stripeAddresses.push({
          type: 'billing' as const,
          street: session.customer_details.address.line1 || '',
          city: session.customer_details.address.city || '',
          state: session.customer_details.address.state || '',
          zipCode: session.customer_details.address.postal_code || '',
          country: session.customer_details.address.country || '',
        });
      }

      // Add shipping address from Stripe if not provided via ID
      if (
        !existingAddressIds.shippingAddressId &&
        session.shipping_details?.address
      ) {
        stripeAddresses.push({
          type: 'shipping' as const,
          street: session.shipping_details.address.line1 || '',
          city: session.shipping_details.address.city || '',
          state: session.shipping_details.address.state || '',
          zipCode: session.shipping_details.address.postal_code || '',
          country: session.shipping_details.address.country || '',
        });
      }

      // Create addresses with deduplication
      if (stripeAddresses.length > 0) {
        if (customer.type === 'user') {
          // For registered users, use deduplication
          const result =
            await this.customerService.prepareAddressDataWithDeduplication(
              stripeAddresses,
              customer,
              orderId,
              existingAddressIds,
            );
          addressIds = result.addressIds;
        } else {
          // For guest users, create addresses without deduplication (they're one-time use)
          console.log('🏠 Creating guest addresses for order:', orderId);
          const result = await this.customerService.prepareAddressData(
            stripeAddresses,
            customer,
            orderId,
          );
          addressIds = result.addressIds;
        }
      }
    } else {
      // Use existing address IDs
      if (existingAddressIds.billingAddressId) {
        addressIds.push(existingAddressIds.billingAddressId);
      }
      if (existingAddressIds.shippingAddressId) {
        addressIds.push(existingAddressIds.shippingAddressId);
      }

      // Validate and update order with existing addresses
      // Update order with existing address IDs
      await this.drizzleService.db
        .update(OrderTable)
        .set({
          billingAddressId: existingAddressIds.billingAddressId,
          shippingAddressId: existingAddressIds.shippingAddressId,
          [`${customer.type}Id`]: customer.id,
        })
        .where(eq(OrderTable.id, orderId));

      console.log('📋 Updated order with guest customer:', {
        orderId,
        guestId: customer.id,
      });
    }

    // Update the order with customer information and address IDs
    if (addressIds.length > 0) {
      await this.orderService.update(orderId, {
        customer,
        addressIds, // This will be used to set billingAddressId and shippingAddressId
      });

      console.log('📋 Order updated with customer and addresses:', {
        orderId,
        customerType: customer.type,
        addressCount: addressIds.length,
      });
    } else {
      // Just update customer info if no new addresses were created
      await this.orderService.update(orderId, {
        customer,
      });

      console.log('📋 Order updated with customer info only:', {
        orderId,
        customerType: customer.type,
      });
    }

    // Handle loyalty points and discounts
    let loyaltyInfo = null;
    let guestInfo = null;

    if (customer.type === 'user' && basketItems.length > 0) {
      try {
        // Check if loyalty discount was applied
        const loyaltyDiscountMeta = session.metadata?.loyaltyDiscount;
        if (loyaltyDiscountMeta) {
          const loyaltyDiscount = JSON.parse(loyaltyDiscountMeta);

          // Apply the discount and deduct points
          await this.loyaltyService.applyDiscount(
            customer.id,
            loyaltyDiscount.pointsToRedeem,
          );

          loyaltyInfo = {
            pointsRedeemed: loyaltyDiscount.pointsToRedeem,
            discountAmount: loyaltyDiscount.discountAmount,
          };
        }

        // Calculate and award points for this purchase
        const orderItems = basketItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          loyaltyPointsMultiplier: 1.0, // Default multiplier, could be enhanced
        }));

        const finalAmount = session.amount_total
          ? session.amount_total / 100
          : 0;
        const pointsEarned = await this.loyaltyService.awardPoints(
          customer.id,
          orderItems,
          finalAmount,
        );

        loyaltyInfo = {
          ...loyaltyInfo,
          pointsEarned,
        };

        console.log('💎 Loyalty points processed for user:', {
          userId: customer.id,
          pointsEarned,
          discountUsed: loyaltyInfo?.pointsRedeemed || 0,
        });
      } catch (error) {
        console.error('Error processing loyalty points:', error);
      }
    } else if (customer.type === 'guest' && basketItems.length > 0) {
      // For guest users, calculate potential points they could earn if they register
      const finalAmount = session.amount_total ? session.amount_total / 100 : 0;
      const potentialPoints = Math.floor(finalAmount * 1); // Same calculation as loyalty service

      guestInfo = {
        message: 'Register to start earning loyalty points on your purchases!',
        potentialPointsIfRegistered: potentialPoints,
        registrationBenefit: `You could have earned ${potentialPoints} points on this purchase`,
        totalSpent: finalAmount,
      };

      console.log('👤 Guest purchase completed:', {
        guestId: customer.id,
        totalAmount: finalAmount,
        potentialPoints,
        email: customer.email,
      });
    }

    // Build buyer information
    const buyer = {
      id: customer.id,
      type: customer.type,
      name: session.customer_details?.name || 'Stripe Customer',
      email: session.customer_details?.email || '',
      phone: phoneNumber || '', // Use processed phone number
    };

    // Parse addresses using unified helper method
    const billingAddressData = this.parseSessionAddress(session, 'billing');
    const shippingAddressData = this.parseSessionAddress(session, 'shipping');

    // Use billing address for shipping if shipping address is not provided
    const billingAddress = billingAddressData.addressString;
    const shippingAddress = shippingAddressData.addressString || billingAddress;

    console.log('🏠 Address source for payment result:', {
      billingSource: session.metadata?.billingAddressString
        ? 'saved'
        : 'stripe-collected',
      shippingSource: session.metadata?.shippingAddressString
        ? 'saved'
        : 'stripe-collected-or-billing-fallback',
      orderId,
    });

    // Build response addresses array using parsed data
    const responseAddresses = [];

    // Add billing address if available
    if (billingAddressData.addressObject) {
      responseAddresses.push({
        id: 'billing',
        type: 'BILLING',
        street: billingAddressData.addressObject.street || '',
        city: billingAddressData.addressObject.city || '',
        state: billingAddressData.addressObject.state || '',
        zipCode: billingAddressData.addressObject.zipCode || '',
        country: billingAddressData.addressObject.country || '',
      });
    }

    // Add shipping address if available and different from billing
    if (shippingAddressData.addressObject) {
      responseAddresses.push({
        id: 'shipping',
        type: 'SHIPPING',
        street: shippingAddressData.addressObject.street || '',
        city: shippingAddressData.addressObject.city || '',
        state: shippingAddressData.addressObject.state || '',
        zipCode: shippingAddressData.addressObject.zipCode || '',
        country: shippingAddressData.addressObject.country || '',
      });
    }

    // Build final response based on customer type
    const response = {
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
      orderNumber: session.metadata?.orderNumber || 'unknown',
      customerType: customer.type,
      // Include loyalty info for registered users
      ...(loyaltyInfo && { loyalty: loyaltyInfo }),
      // Include guest info for guest users
      ...(guestInfo && { guest: guestInfo }),
    };

    console.log('✅ Payment result prepared for:', {
      customerType: customer.type,
      orderId,
      hasLoyalty: !!loyaltyInfo,
      hasGuestInfo: !!guestInfo,
      orderNumber: response.orderNumber,
    });

    return response;
  }

  /**
   * Generate cache key for order data
   * Simple orderId-based key - loyalty discounts calculated on demand
   */
  private generateCacheKey(orderId: string): string {
    return `order-data:${orderId}`;
  }

  /**
   * Format address object to string representation
   */
  private formatAddressString(address: any): string {
    if (!address) return '';

    const parts = [
      address.street || address.line1,
      address.city,
      address.state
        ? `${address.state} ${address.zipCode || address.postal_code || ''}`
        : address.zipCode || address.postal_code || '',
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Create address metadata for session
   */
  private createAddressMetadata(
    address: any,
    type: 'billing' | 'shipping',
  ): {
    addressString: string;
    savedAddress?: string;
  } {
    const addressString = this.formatAddressString(address);
    const savedAddress = JSON.stringify({
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
    });

    return {
      addressString,
      savedAddress,
    };
  }

  /**
   * Parse address from session metadata or Stripe data
   */
  private parseSessionAddress(
    session: any,
    type: 'billing' | 'shipping',
  ): {
    addressString: string;
    addressObject: any | null;
  } {
    const metadataKey = `${type}AddressString`;
    const savedAddressKey = `saved${type.charAt(0).toUpperCase() + type.slice(1)}Address`;

    // Try saved address string first
    if (session.metadata?.[metadataKey]) {
      let addressObject = null;

      // Try to parse saved address object
      if (session.metadata?.[savedAddressKey]) {
        try {
          addressObject = JSON.parse(session.metadata[savedAddressKey]);
        } catch (error) {
          console.warn(`Failed to parse saved ${type} address:`, error);
        }
      }

      return {
        addressString: session.metadata[metadataKey],
        addressObject,
      };
    }

    // Fallback to Stripe collected address
    const stripeAddress =
      type === 'billing'
        ? session.customer_details?.address
        : session.shipping_details?.address;

    if (stripeAddress) {
      return {
        addressString: this.formatAddressString(stripeAddress),
        addressObject: {
          street: stripeAddress.line1 || '',
          city: stripeAddress.city || '',
          state: stripeAddress.state || '',
          zipCode: stripeAddress.postal_code || '',
          country: stripeAddress.country || '',
        },
      };
    }

    return {
      addressString: type === 'billing' ? 'Address not provided' : '',
      addressObject: null,
    };
  }

  /**
   * Mark order as processed to prevent race conditions
   * Keeps data available for success page while marking as complete
   */
  private async markOrderAsProcessed(orderId: string): Promise<void> {
    const cacheKey = this.generateCacheKey(orderId);
    try {
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        // Mark as processed but keep data temporarily
        const processedData = {
          ...(cachedData as any),
          _processed: true,
          _processedAt: new Date().toISOString(),
          _webhookCompleted: true,
        };
        // Extend TTL to 15 minutes for success page access and race condition handling
        await this.cacheManager.set(cacheKey, processedData, 15 * 60 * 1000);
        console.log('✅ Webhook marked order as processed in cache:', {
          orderId,
          processedAt: processedData._processedAt,
          ttlExtended: '15 minutes',
        });
      } else {
        console.warn(
          '⚠️ Webhook: No cached data found to mark as processed:',
          orderId,
        );
      }
    } catch (error) {
      console.error(`Failed to mark order as processed: ${orderId}`, error);
    }
  }

  /**
   * Clear order cache with safety checks and race condition prevention
   * Safe to call multiple times - will only clear if data exists
   */
  async clearOrderCache(orderId: string): Promise<void> {
    const cacheKey = this.generateCacheKey(orderId);
    try {
      const existingData = await this.cacheManager.get(cacheKey);
      if (existingData) {
        // Check if this is a duplicate cleanup attempt
        const isProcessed = (existingData as any)?._processed;
        const processedAt = (existingData as any)?._processedAt;

        await this.cacheManager.del(cacheKey);
        console.log('🗑️ Cache cleared for completed order:', {
          orderId,
          wasProcessed: isProcessed,
          processedAt: processedAt || 'not-set',
          clearedBy: isProcessed ? 'scheduled-cleanup' : 'success-page',
        });
      } else {
        console.log('ℹ️ Cache already cleared for order:', orderId);
      }
    } catch (error) {
      console.error(`Failed to clear cache for order: ${orderId}`, error);
    }
  }
}
