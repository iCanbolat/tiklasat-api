import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
//   stripe: {
//     apiKey: process.env.STRIPE_API_KEY || '',
//     secretKey: process.env.STRIPE_SECRET_KEY || '',
//   },
  iyzico: {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
  },
}));
