import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as hbs from 'hbs';
import * as fs from 'fs';
import * as path from 'path';
import { CreateReceiptMailDto } from './dto/create-mail.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private getTemplate(templateName: string, replacements: any): string {
    const filePath = path.join(
      process.cwd(),
      'src//mail/templates',
      `${templateName}.hbs`,
    );

    if (!fs.existsSync(filePath)) {
      this.logger.error(`❌ Email template not found: ${filePath}`);
      throw new Error(`Template file ${filePath} not found.`);
    }

    const template = fs.readFileSync(filePath, 'utf-8');
    return hbs.compile(template)(replacements);
  }

  async sendPaymentReceipt({
    email,
    items,
    total,
    billingAddress,
    shippingAddress,
    orderId,
  }: CreateReceiptMailDto): Promise<void> {
    try {
      const emailHtml = this.getTemplate('payment-receipt', {
        items,
        total,
        billingAddress,
        shippingAddress,
        orderId,
      });
  
      await this.resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Your Order Receipt - Order #${orderId}`,
        html: emailHtml,
      });
  
      this.logger.log(`✅ Payment receipt sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${email}: ${error.message}`);
    }
  }
  

  // create(createMailDto: CreateMailDto) {
  //   return 'This action adds a new mail';
  // }
}
