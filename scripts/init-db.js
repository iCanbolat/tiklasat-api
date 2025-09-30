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
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false,
  });

  try {
    console.log('📊 Creating enums if not exist...');
    
    // Create all necessary enums
    await pool.query(`
      DO $$ 
      BEGIN
        -- Currency enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_enum') THEN
          CREATE TYPE currency_enum AS ENUM ('TRY', 'USD', 'EUR');
        END IF;

        -- Order status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM (
            'PENDING',
            'PROCESSING', 
            'SHIPPED',
            'DELIVERED',
            'CANCELLED',
            'REFUNDED'
          );
        END IF;

        -- Payment status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
          CREATE TYPE payment_status AS ENUM (
            'PENDING',
            'COMPLETED',
            'FAILED',
            'REFUNDED',
            'CANCELLED'
          );
        END IF;

        -- Payment method enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
          CREATE TYPE payment_method AS ENUM (
            'CREDIT_CARD',
            'DEBIT_CARD',
            'BANK_TRANSFER',
            'CASH_ON_DELIVERY',
            'IYZICO'
          );
        END IF;

        -- User role enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN', 'MODERATOR');
        END IF;

        -- Notification type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          CREATE TYPE notification_type AS ENUM (
            'ORDER_UPDATE',
            'PAYMENT_CONFIRMATION',
            'SHIPPING_UPDATE',
            'PROMOTION',
            'SYSTEM'
          );
        END IF;

        -- Loyalty tier enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
          CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
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
