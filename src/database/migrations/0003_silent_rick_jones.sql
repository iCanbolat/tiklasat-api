DO $$ BEGIN
 CREATE TYPE "public"."card_family" AS ENUM('BONUS', 'AXESS', 'WORLD', 'CARD_F', 'PARAF', 'MAXIMUM', 'ADVANTAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_type" AS ENUM('CREDIT_CARD', 'DEBIT_CARD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
