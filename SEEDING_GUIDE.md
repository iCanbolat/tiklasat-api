# Database Seeding Guide

## 🌱 Database Seeding Nedir?

Database seeding, veritabanınızı demo veya test amaçlı sahte verilerle doldurmak için kullanılan bir işlemdir.

## 📦 Seed Edilen Veriler

### 1. Kullanıcılar

- **1 Admin**: `admin@tiklasat.com`
- **3 Demo Customer**: `customer1@example.com`, `customer2@example.com`, `customer3@example.com`
- Şifre (hepsi için): `YourHashedPasswordHere` (değiştirmeniz gerekiyor)

### 2. Kategoriler (5 adet)

- Elektronik
- Giyim
- Ev & Yaşam
- Kitap
- Spor

### 3. Ürünler (10 adet)

- iPhone 15 Pro (54.999,99 TL)
  - **Varyantlar**: 128GB/256GB/512GB, Titanyum Mavi/Siyah/Beyaz
- Samsung Galaxy S24 (49.999,99 TL)
  - **Varyantlar**: 256GB/512GB, Phantom Black/Silver/Violet
- MacBook Pro M3 (84.999,99 TL)
  - **Varyantlar**: 16GB/32GB RAM, 512GB/1TB/2TB SSD, Space Gray/Silver
- Erkek Kot Pantolon (499,99 TL)
  - **Varyantlar**: S/M/L/XL/XXL, Koyu Mavi/Açık Mavi/Siyah
- Kadın T-Shirt (299,99 TL)
  - **Varyantlar**: XS/S/M/L/XL, Beyaz/Siyah/Lacivert/Kırmızı
- Kahve Makinesi (3.999,99 TL)
- LED Masa Lambası (599,99 TL)
- Harry Potter Seti (899,99 TL)
- Yoga Matı (349,99 TL)
- Koşu Ayakkabısı (1.299,99 TL)
  - **Varyantlar**: 38-44 Numara, Siyah/Beyaz/Mavi

### 4. Ürün Varyantları (6 ürün)

- **iPhone 15 Pro**: Depolama (3) + Renk (3) = 6 varyant
- **Samsung S24**: Depolama (2) + Renk (3) = 5 varyant
- **MacBook Pro**: RAM (2) + Depolama (3) + Renk (2) = 7 varyant
- **Kot Pantolon**: Beden (5) + Renk (3) = 8 varyant
- **T-Shirt**: Beden (5) + Renk (4) = 9 varyant
- **Koşu Ayakkabısı**: Numara (7) + Renk (3) = 10 varyant

### 5. Ürün Görselleri

- İlk 5 ürün için placeholder görseller (Picsum Photos)

### 6. Siparişler

- 5 rastgele demo sipariş
- Farklı statülerde (PENDING, PROCESSING, SHIPPED, DELIVERED)
- 1-3 arası ürün içeren

### 7. Yorumlar

- ~10 rastgele ürün yorumu
- 3-5 yıldız arası puanlar
- Faker.js ile oluşturulmuş yorumlar

### 8. Bildirimler

- Her tipten 1'er örnek bildirim

## 🚀 Kullanım

### Development (Local)

```bash
# Database'i initialize et
npm run db:init

# Seed verilerini ekle
npm run db:seed
```

### Production (Render)

```bash
# SSH veya Render Shell ile bağlan
npm run db:seed
```

## ⚠️ Önemli Notlar

### 1. Şifre Hash'lerini Değiştirin

Scriptteki `$2b$10$YourHashedPasswordHere` değerini gerçek bcrypt hash ile değiştirin:

```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('yourPassword', 10);
```

### 2. Çalıştırma Sırası

```
1. npm run db:init   (Enums + Sequences + Tables)
2. npm run db:seed   (Demo data)
```

### 3. Tekrar Çalıştırma

Script idempotent değildir. Tekrar çalıştırırsanız:

- Aynı email'li kullanıcılar skip edilir (ON CONFLICT DO NOTHING)
- Aynı slug'lu ürünler güncellenir
- Yeni siparişler ve yorumlar eklenir

### 4. Temizleme

Database'i sıfırlamak için:

```bash
# Tüm tabloları temizle
npm run db:push  # Fresh push
npm run db:seed  # Tekrar seed et
```

## 🎨 Özelleştirme

### Daha Fazla Ürün Eklemek

`scripts/seed-db.js` dosyasındaki `productData` array'ine yeni ürünler ekleyin:

```javascript
{
  name: 'Yeni Ürün',
  description: 'Ürün açıklaması',
  price: 999.99,
  cost: 500.00,
  currency: 'TRY',
  sku: 'URN-001',
  stockQuantity: 50,
  category: categoryIds[0], // Kategori ID'si
}
```

### Kategori Eklemek

`categories` array'ine yeni kategori ekleyin:

```javascript
{
  name: 'Yeni Kategori',
  slug: 'yeni-kategori',
  description: 'Kategori açıklaması'
}
```

## 📊 Seed Sonrası Kontrol

### 1. API ile Kontrol

```bash
# Ürünleri listele
curl https://your-api.com/api/products

# Kategorileri listele
curl https://your-api.com/api/categories

# Siparişleri listele (Auth gerekli)
curl https://your-api.com/api/orders
```

### 2. Database'de Kontrol

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM categories;
```

## 🔧 Troubleshooting

### Hata: "relation does not exist"

```bash
# Önce init çalıştırın
npm run db:init
```

### Hata: "duplicate key value"

```bash
# Normal - conflict'ler skip ediliyor
# Veya database'i temizleyin ve tekrar seed edin
```

### Hata: "cannot connect to database"

```bash
# DATABASE_URL environment variable'ını kontrol edin
echo $DATABASE_URL
```

## 🎯 Demo Senaryoları

### E-commerce Vitrini

- 10 farklı kategoride ürünler
- Gerçekçi fiyatlandırma
- Stok yönetimi
- Ürün görselleri

### Sipariş Yönetimi

- Farklı statülerde siparişler
- Multi-item siparişler
- Customer ilişkileri

### Review Sistemi

- 3-5 yıldız arası değerlendirmeler
- Faker.js ile gerçekçi yorumlar
- User-product ilişkileri

## 📝 Lisans

Bu seed scripti sadece **demo ve development** amaçlıdır. Production'da kullanmadan önce verileri gözden geçirin ve gerçek şifreler kullanın.
