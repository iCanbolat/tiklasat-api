const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

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
    // 0. Clean existing demo data if re-seeding
    if (process.env.CLEAN_BEFORE_SEED === 'true') {
      console.log('🧹 Cleaning existing demo data...');

      // Helper function to safely delete from table if it exists
      const safeDelete = async (tableName) => {
        try {
          await pool.query(`DELETE FROM ${tableName} WHERE TRUE;`);
        } catch (error) {
          // Ignore "relation does not exist" errors (42P01)
          if (error.code !== '42P01') {
            throw error;
          }
        }
      };

      // Delete in correct order (foreign key constraints)
      await safeDelete('notifications');
      await safeDelete('reviews');
      await safeDelete('order_items');
      await safeDelete('orders');
      await safeDelete('payments');
      await safeDelete('product_variants');
      await safeDelete('product_images');
      await safeDelete('products_to_categories');
      await safeDelete('products');
      await safeDelete('categories');
      await safeDelete('customer_details');
      await safeDelete('refresh_tokens');
      await safeDelete('users');

      console.log('✅ Existing data cleaned');
    }

    // 1. Create Admin User
    console.log('👤 Creating admin user...');
    const adminResult = await pool.query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES (
        'Admin User',
        'admin@tiklasat.com',
        '$2a$10$iFAXP3x7MBxXKPRRIdQRcOrt.w5LDwAA24G8Taoqite3CQhWL6P6u',
        '+905551234567',
        'ADMIN'
      )
      RETURNING id;
    `);
    console.log('✅ Admin user created');

    // 2. Create Demo Customers
    console.log('👥 Creating demo customers...');
    const customerEmails = [
      'customer1@example.com',
      'customer2@example.com',
      'customer3@example.com',
    ];

    for (const email of customerEmails) {
      await pool.query(
        `
        INSERT INTO users (name, email, password, phone, role)
        VALUES ($1, $2, $3, $4, 'USER');
      `,
        [
          faker.person.fullName(),
          email,
          '$2a$10$iFAXP3x7MBxXKPRRIdQRcOrt.w5LDwAA24G8Taoqite3CQhWL6P6u',
          faker.phone.number('+905#########'),
        ],
      );
    }
    console.log('✅ Demo customers created');

    // 3. Create Categories
    console.log('📁 Creating categories...');
    const categories = [
      {
        name: 'Elektronik',
        slug: 'elektronik',
        description: 'Elektronik ürünler',
      },
      { name: 'Giyim', slug: 'giyim', description: 'Giyim ürünleri' },
      {
        name: 'Ev & Yaşam',
        slug: 'ev-yasam',
        description: 'Ev ve yaşam ürünleri',
      },
      { name: 'Kitap', slug: 'kitap', description: 'Kitaplar' },
      { name: 'Spor', slug: 'spor', description: 'Spor ürünleri' },
    ];

    const categoryIds = [];
    for (const cat of categories) {
      const result = await pool.query(
        `
        INSERT INTO categories (name, slug, description)
        VALUES ($1, $2, $3)
        RETURNING id;
      `,
        [cat.name, cat.slug, cat.description],
      );
      categoryIds.push(result.rows[0].id);
    }
    console.log('✅ Categories created');

    // 4. Create Products
    console.log('📦 Creating products...');
    const productData = [
      {
        name: 'iPhone 15 Pro',
        description: 'En yeni iPhone modeli, A17 Pro çip ile güçlendirilmiş',
        price: 54999.99,
        cost: 45000.0,
        currency: 'TRY',
        sku: 'IPH-15-PRO-128',
        stockQuantity: 50,
        category: categoryIds[0],
      },
      {
        name: 'Samsung Galaxy S24',
        description: "Samsung'un flagship telefonu, 200MP kamera",
        price: 49999.99,
        cost: 42000.0,
        currency: 'TRY',
        sku: 'SAM-S24-256',
        stockQuantity: 35,
        category: categoryIds[0],
      },
      {
        name: 'MacBook Pro M3',
        description: '14-inch, M3 çip, 16GB RAM, 512GB SSD',
        price: 84999.99,
        cost: 72000.0,
        currency: 'TRY',
        sku: 'MBP-M3-14-512',
        stockQuantity: 20,
        category: categoryIds[0],
      },
      {
        name: 'Erkek Slim Fit Kot Pantolon',
        description: '%100 pamuk, rahat kesim kot pantolon',
        price: 499.99,
        cost: 200.0,
        currency: 'TRY',
        sku: 'KOT-EK-001',
        stockQuantity: 100,
        category: categoryIds[1],
      },
      {
        name: 'Kadın Casual T-Shirt',
        description: 'Rahat günlük kullanım için ideal pamuklu tişört',
        price: 299.99,
        cost: 120.0,
        currency: 'TRY',
        sku: 'TSH-KD-002',
        stockQuantity: 150,
        category: categoryIds[1],
      },
      {
        name: 'Kahve Makinesi Deluxe',
        description: 'Otomatik cappuccino yapma özelliği',
        price: 3999.99,
        cost: 2500.0,
        currency: 'TRY',
        sku: 'KAH-DLX-001',
        stockQuantity: 25,
        category: categoryIds[2],
      },
      {
        name: 'LED Masa Lambası',
        description: 'Şarj edilebilir, kademeli ışık ayarı',
        price: 599.99,
        cost: 250.0,
        currency: 'TRY',
        sku: 'LAM-LED-003',
        stockQuantity: 60,
        category: categoryIds[2],
      },
      {
        name: 'Harry Potter Seti (7 Kitap)',
        description: 'Tam set, orijinal Türkçe çeviri',
        price: 899.99,
        cost: 500.0,
        currency: 'TRY',
        sku: 'KIT-HP-SET',
        stockQuantity: 40,
        category: categoryIds[3],
      },
      {
        name: 'Yoga Matı Premium',
        description: 'Anti-slip, 6mm kalınlık, çanta dahil',
        price: 349.99,
        cost: 150.0,
        currency: 'TRY',
        sku: 'SPR-YOGA-001',
        stockQuantity: 75,
        category: categoryIds[4],
      },
      {
        name: 'Koşu Ayakkabısı Pro',
        description: 'Profesyonel koşucular için tasarlandı',
        price: 1299.99,
        cost: 700.0,
        currency: 'TRY',
        sku: 'AYK-KOS-PRO',
        stockQuantity: 45,
        category: categoryIds[4],
      },
    ];

    const productIds = [];
    for (const product of productData) {
      const slug = product.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const result = await pool.query(
        `
        INSERT INTO products (
          name, description, price, cost, slug, sku, currency,
          stock_quantity, manage_stock, allow_backorders, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, 'ACTIVE')
        RETURNING id;
      `,
        [
          product.name,
          product.description,
          product.price,
          product.cost,
          slug,
          product.sku,
          product.currency,
          product.stockQuantity,
        ],
      );

      const productId = result.rows[0].id;
      productIds.push(productId);

      // Link product to category
      await pool.query(
        `
        INSERT INTO products_to_categories (product_id, category_id)
        VALUES ($1, $2);
      `,
        [productId, product.category],
      );
    }
    console.log(`✅ ${productData.length} products created`);

    // 5. Add Product Images
    console.log('🖼️  Adding product images...');
    for (const productId of productIds.slice(0, 5)) {
      await pool.query(
        `
        INSERT INTO product_images (product_id, url, display_order)
        VALUES 
          ($1, $2, 1),
          ($1, $3, 2);
      `,
        [
          productId,
          `https://picsum.photos/seed/${productId}/800/800`,
          `https://picsum.photos/seed/${productId}-2/800/800`,
        ],
      );
    }
    console.log('✅ Product images added');

    // 6. Add Product Variants
    console.log('🎨 Adding product variants...');

    // iPhone 15 Pro variants (first product)
    const iphoneId = productIds[0];
    const iphoneVariants = [
      { type: 'Depolama', value: '128GB' },
      { type: 'Depolama', value: '256GB' },
      { type: 'Depolama', value: '512GB' },
      { type: 'Renk', value: 'Titanyum Mavi' },
      { type: 'Renk', value: 'Titanyum Siyah' },
      { type: 'Renk', value: 'Titanyum Beyaz' },
    ];

    for (const variant of iphoneVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [iphoneId, variant.type, variant.value],
      );
    }

    // Samsung Galaxy S24 variants (second product)
    const samsungId = productIds[1];
    const samsungVariants = [
      { type: 'Depolama', value: '256GB' },
      { type: 'Depolama', value: '512GB' },
      { type: 'Renk', value: 'Phantom Black' },
      { type: 'Renk', value: 'Phantom Silver' },
      { type: 'Renk', value: 'Phantom Violet' },
    ];

    for (const variant of samsungVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [samsungId, variant.type, variant.value],
      );
    }

    // MacBook Pro M3 variants (third product)
    const macbookId = productIds[2];
    const macbookVariants = [
      { type: 'RAM', value: '16GB' },
      { type: 'RAM', value: '32GB' },
      { type: 'Depolama', value: '512GB SSD' },
      { type: 'Depolama', value: '1TB SSD' },
      { type: 'Depolama', value: '2TB SSD' },
      { type: 'Renk', value: 'Space Gray' },
      { type: 'Renk', value: 'Silver' },
    ];

    for (const variant of macbookVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [macbookId, variant.type, variant.value],
      );
    }

    // Kot Pantolon variants (fourth product)
    const kotId = productIds[3];
    const kotVariants = [
      { type: 'Beden', value: 'S' },
      { type: 'Beden', value: 'M' },
      { type: 'Beden', value: 'L' },
      { type: 'Beden', value: 'XL' },
      { type: 'Beden', value: 'XXL' },
      { type: 'Renk', value: 'Koyu Mavi' },
      { type: 'Renk', value: 'Açık Mavi' },
      { type: 'Renk', value: 'Siyah' },
    ];

    for (const variant of kotVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [kotId, variant.type, variant.value],
      );
    }

    // T-Shirt variants (fifth product)
    const tshirtId = productIds[4];
    const tshirtVariants = [
      { type: 'Beden', value: 'XS' },
      { type: 'Beden', value: 'S' },
      { type: 'Beden', value: 'M' },
      { type: 'Beden', value: 'L' },
      { type: 'Beden', value: 'XL' },
      { type: 'Renk', value: 'Beyaz' },
      { type: 'Renk', value: 'Siyah' },
      { type: 'Renk', value: 'Lacivert' },
      { type: 'Renk', value: 'Kırmızı' },
    ];

    for (const variant of tshirtVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [tshirtId, variant.type, variant.value],
      );
    }

    // Koşu Ayakkabısı variants (last product)
    const ayakkabiId = productIds[9];
    const ayakkabiVariants = [
      { type: 'Numara', value: '38' },
      { type: 'Numara', value: '39' },
      { type: 'Numara', value: '40' },
      { type: 'Numara', value: '41' },
      { type: 'Numara', value: '42' },
      { type: 'Numara', value: '43' },
      { type: 'Numara', value: '44' },
      { type: 'Renk', value: 'Siyah' },
      { type: 'Renk', value: 'Beyaz' },
      { type: 'Renk', value: 'Mavi' },
    ];

    for (const variant of ayakkabiVariants) {
      await pool.query(
        `
        INSERT INTO product_variants (product_id, variant_type, value)
        VALUES ($1, $2, $3)
        
      `,
        [ayakkabiId, variant.type, variant.value],
      );
    }

    console.log('✅ Product variants added');

    // 7. Create Sample Orders
    console.log('🛒 Creating sample orders...');
    const users = await pool.query(
      `SELECT id FROM users WHERE role = 'USER' LIMIT 3`,
    );

    if (users.rows.length > 0) {
      for (let i = 0; i < 5; i++) {
        const userId =
          users.rows[Math.floor(Math.random() * users.rows.length)].id;
        const randomProducts = productIds
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3) + 1);

        // Create customer details if not exists
        await pool.query(
          `
          INSERT INTO customer_details (user_id, loyalty_points)
          VALUES ($1, 0);
        `,
          [userId],
        );

        // Create order
        const orderResult = await pool.query(
          `
          INSERT INTO orders (customer_id, status)
          VALUES ($1, $2)
          RETURNING id;
        `,
          [
            userId,
            ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'][
              Math.floor(Math.random() * 4)
            ],
          ],
        );

        const orderId = orderResult.rows[0].id;

        // Add order items
        for (const productId of randomProducts) {
          const quantity = Math.floor(Math.random() * 3) + 1;
          await pool.query(
            `
            INSERT INTO order_items (order_id, product_id, quantity)
            VALUES ($1, $2, $3);
          `,
            [orderId, productId, quantity],
          );
        }
      }
      console.log('✅ Sample orders created');
    }

    // 7. Create Sample Reviews
    console.log('⭐ Creating sample reviews...');
    if (users.rows.length > 0 && productIds.length > 0) {
      for (let i = 0; i < 10; i++) {
        const userId =
          users.rows[Math.floor(Math.random() * users.rows.length)].id;
        const productId =
          productIds[Math.floor(Math.random() * productIds.length)];
        const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars

        await pool.query(
          `
          INSERT INTO reviews (user_id, product_id, rating, comment)
          VALUES ($1, $2, $3, $4);
        `,
          [userId, productId, rating, faker.lorem.paragraph()],
        );
      }
      console.log('✅ Sample reviews created');
    }

    // 8. Create Notifications
    console.log('🔔 Creating sample notifications...');
    const notificationTypes = [
      'ORDER',
      'INVENTORY',
      'CUSTOMER',
      'PAYMENT',
      'SYSTEM',
    ];
    for (let i = 0; i < 5; i++) {
      await pool.query(
        `
        INSERT INTO notifications (type, title, message, is_read)
        VALUES ($1, $2, $3, false);
      `,
        [
          notificationTypes[i],
          `${notificationTypes[i]} Bildirimi`,
          faker.lorem.sentence(),
        ],
      );
    }
    console.log('✅ Sample notifications created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Admin user: admin@tiklasat.com`);
    console.log(`   - Demo customers: ${customerEmails.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${productData.length}`);
    console.log(`   - Product variants: 6 products with multiple variants`);
    console.log(`   - Product images: 10+ images`);
    console.log(`   - Orders: 5 sample orders`);
    console.log(`   - Reviews: ~10 sample reviews`);
    console.log(`   - Notifications: 5 sample notifications`);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
