const { Pool } = require('pg');
const { execSync } = require('child_process');

async function initDatabase() {
  console.log('🔧 Initializing database...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log('📊 Creating enums if not exist...');

    // Create all necessary enums
    await pool.query(`
      DO $$ 
      BEGIN
        -- User role status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_status') THEN
          CREATE TYPE user_role_status AS ENUM ('ADMIN', 'USER');
        END IF;

        -- Currency enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_enum') THEN
          CREATE TYPE currency_enum AS ENUM ('TRY', 'USD', 'EUR');
        END IF;

        -- Product status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
          CREATE TYPE product_status AS ENUM ('ACTIVE', 'ARCHIVED', 'LOW_STOCK', 'OUT_OF_STOCK');
        END IF;

        -- Order status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM (
            'PENDING',
            'PROCESSING', 
            'SHIPPED',
            'DELIVERED',
            'CANCELLED'
          );
        END IF;

        -- Payment status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
          CREATE TYPE payment_status AS ENUM (
            'PENDING',
            'COMPLETED',
            'FAILED',
            'REFUNDED'
          );
        END IF;

        -- Card type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
          CREATE TYPE card_type AS ENUM ('CREDIT_CARD', 'DEBIT_CARD');
        END IF;

        -- Notification type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          CREATE TYPE notification_type AS ENUM (
            'ORDER',
            'INVENTORY',
            'CUSTOMER',
            'PAYMENT',
            'SYSTEM'
          );
        END IF;

        -- Loyalty transaction type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_transaction_type') THEN
          CREATE TYPE loyalty_transaction_type AS ENUM (
            'EARNED',
            'REDEEMED',
            'EXPIRED',
            'REFUNDED',
            'ADJUSTED'
          );
        END IF;

      END $$;
    `);

    console.log('✅ Enums created successfully');
    console.log('📊 Pushing schema to database...');

    // Now run drizzle push
    execSync('npm run db:push', { stdio: 'inherit' });

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
