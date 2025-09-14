# Stripe Payment Strategy Implementation

## Overview

This document outlines the improved Stripe payment strategy implementation that follows the same pattern as the Iyzico strategy, with proper order population, customer management, and event handling.

## Key Features Implemented

### 1. **Strategy-Level Order Population**

```typescript
async populateOrderData(orderId: string, checkoutInitDto: StripeInitCheckoutDto): Promise<any>
```

**What it does:**

- Fetches order with items from database
- Validates order has items
- Calculates total price from order items
- Maps order items to Stripe `line_items` format
- Includes product categories in metadata
- Converts prices to cents (Stripe requirement)

**Benefits:**

- Server-side price validation prevents manipulation
- Automatic line items generation from order
- Consistent product categorization

### 2. **Customer Management**

```typescript
// In createCheckoutFormSession()
const customer = await this.customerService.findOrCreate({
  email: stripeInitCheckoutDto.customer_email,
  userId: stripeInitCheckoutDto.userId,
  name: 'Stripe Customer',
  phone: null,
  identityNo: null,
});
```

**Features:**

- Creates or finds existing customers
- Updates order with customer information
- Associates customer with Stripe session

### 3. **Enhanced Checkout Session Creation**

```typescript
const response = await this.stripe.checkout.sessions.create({
  mode: stripeInitCheckoutDto.mode,
  success_url: stripeInitCheckoutDto.success_url,
  cancel_url: stripeInitCheckoutDto.cancel_url,
  line_items: stripeInitCheckoutDto.line_items, // Auto-populated
  billing_address_collection: 'required',
  shipping_address_collection: {
    allowed_countries: ['US', 'CA', 'GB', 'TR'],
  },
  metadata: {
    orderId,
    orderNumber,
    totalAmount,
    itemCount,
  },
});
```

**Features:**

- Automatic line items from order data
- Required billing address collection
- Configurable shipping countries
- Order tracking metadata
- Return session ID as token

### 4. **Improved Payment Result Handling**

```typescript
async getCheckoutFormPaymentResult(token: string): Promise<CheckoutFormResult>
```

**Returns standardized format:**

- Buyer information from Stripe session
- Formatted billing/shipping addresses
- Order items as basket items
- Payment details (amount, payment intent ID)
- Order tracking information

### 5. **Enhanced Webhook Handling**

```typescript
async handleWebhook(data, headers): Promise<any>
```

**Events handled:**

- `checkout.session.completed` - Payment success
- `checkout.session.expired` - Session timeout
- `payment_intent.payment_failed` - Payment failure

**Features:**

- Proper webhook signature verification
- Event emission for order processing
- Automatic receipt email sending
- Consistent logging

## API Usage Examples

### Creating a Stripe Checkout Session

**Request:**

```json
{
  "provider": "STRIPE",
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "mode": "payment",
  "success_url": "https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://yoursite.com/cancel",
  "customer_email": "customer@example.com",
  "payment_method_types": ["card"]
}
```

**Note:** `line_items` are automatically populated from the order items.

**Response:**

```json
{
  "token": "cs_test_abc123...",
  "paymentUrl": "https://checkout.stripe.com/c/pay/cs_test_abc123..."
}
```

### Payment Result Retrieval

**Request:**

```json
{
  "provider": "STRIPE",
  "token": "cs_test_abc123...",
  "orderId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response:**

```json
{
  "buyer": {
    "id": "cus_abc123",
    "type": "user",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "total": 299.99,
  "billingAddress": "123 Main St, City, State 12345, US",
  "shippingAddress": "123 Main St, City, State 12345, US",
  "cardType": "credit",
  "paymentId": "pi_abc123...",
  "orderNumber": "ORD-001",
  "items": [
    {
      "productId": "product-1",
      "quantity": 2
    }
  ]
}
```

## Key Differences from Iyzico

| Feature          | Iyzico                 | Stripe                    |
| ---------------- | ---------------------- | ------------------------- |
| **Data Format**  | `basketItems`          | `line_items`              |
| **Price Format** | Decimal string         | Integer cents             |
| **Categories**   | Required (`category1`) | Optional (in metadata)    |
| **Addresses**    | Required upfront       | Collected during checkout |
| **Customer**     | Required with identity | Email-based               |
| **Payment Flow** | 3DS redirect           | Hosted checkout           |

## Configuration Requirements

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Configuration

```typescript
{
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
}
```

## Error Handling

### Common Error Scenarios

1. **Order not found** - Handled in service layer
2. **Order has no items** - Thrown by `populateOrderData()`
3. **Price calculation errors** - Server-side validation
4. **Customer creation failures** - Graceful fallback
5. **Stripe API errors** - Proper error propagation

### Example Error Response

```json
{
  "statusCode": 400,
  "message": "Order has no items.",
  "error": "Bad Request"
}
```

## Event Flow

### Payment Success Flow

```
Stripe Webhook → handleWebhook() → payment.success event → PaymentListener → Order Update + Email
```

### Payment Failure Flow

```
Stripe Webhook → handleWebhook() → payment.failure event → PaymentListener → Payment Status Update
```

## Testing Considerations

### Unit Tests

- Test `populateOrderData()` with various order scenarios
- Test customer creation/finding logic
- Test line items transformation
- Test webhook event handling

### Integration Tests

- Test complete checkout flow
- Test webhook signature verification
- Test email receipt sending
- Test order status updates

### Stripe Test Cards

```
4242424242424242 - Successful payment
4000000000000002 - Card declined
4000000000009995 - Insufficient funds
```

## Security Best Practices

### 1. **Webhook Security**

- Verify webhook signatures
- Use environment variables for secrets
- Implement idempotency

### 2. **Price Validation**

- Server-side price calculation
- No client-side price manipulation
- Order item validation

### 3. **Customer Data**

- Secure customer information handling
- Email validation
- PCI compliance through Stripe

## Deployment Checklist

- [ ] Configure Stripe webhook endpoint
- [ ] Set environment variables
- [ ] Test webhook signature verification
- [ ] Configure allowed shipping countries
- [ ] Set up success/cancel URLs
- [ ] Test payment flows in sandbox
- [ ] Configure email templates
- [ ] Set up monitoring and logging

## Benefits of This Implementation

1. **Consistency** - Same pattern as Iyzico strategy
2. **Maintainability** - Clear separation of concerns
3. **Security** - Server-side validation and price calculation
4. **Flexibility** - Easy to extend and modify
5. **Reliability** - Proper error handling and event emission
6. **Scalability** - Strategy pattern allows easy provider addition

This implementation ensures that Stripe payments follow the same robust patterns established for Iyzico, providing a consistent and reliable payment experience across all supported providers.
