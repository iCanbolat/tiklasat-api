
ALTER TABLE "orders" ALTER COLUMN "billing_address_id" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "shipping_address_id" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "card_type" "card_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "card_family" "card_family" NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "installments" numeric DEFAULT '1';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "iyzico_payment_id" varchar(36);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "last_four_digits" varchar(4) NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_method";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "status";