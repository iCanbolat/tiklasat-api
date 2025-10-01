# Render Auto-Seeding Configuration

## 🚀 Otomatik Database Seeding

Render deployment sırasında database otomatik olarak seed edilebilir.

## 🔧 Nasıl Çalışır?

### Deployment Flow:

```
1. Docker Build ✅
2. Database Init (enums + sequences + tables) ✅
3. Database Seed (demo data) - OPSIYONEL 🌱
4. NestJS Start ✅
```

## ⚙️ Environment Variable

### `SEED_DATABASE`

Database seeding'i kontrol eden environment variable:

- **`true`**: Deployment sırasında otomatik seed çalışır
- **`false`** veya **boş**: Seed atlanır

## 📋 Kullanım Senaryoları

### 1. İlk Deployment (Demo Data İstiyorsanız)

```yaml
# render.yaml
envVars:
  - key: SEED_DATABASE
    value: true
```

**Veya Render Dashboard'da:**

```
Environment → Add Environment Variable
Key: SEED_DATABASE
Value: true
```

### 2. Production (Gerçek Data)

```yaml
# render.yaml
envVars:
  - key: SEED_DATABASE
    value: false
```

**Veya:**

- `SEED_DATABASE` variable'ını silme veya boş bırakma

### 3. Development/Staging

```yaml
envVars:
  - key: SEED_DATABASE
    value: true # Demo data ile test
```

## 🎯 Ne Zaman Kullanmalı?

### ✅ Seed Çalıştır (`SEED_DATABASE=true`)

- **İlk deployment** (database boş)
- **Demo/staging** environment
- **Test** amaçlı
- **Presentation** için
- **Developer** onboarding

### ❌ Seed Çalıştırma (`SEED_DATABASE=false`)

- **Production** environment (gerçek müşteri datası)
- **Mevcut data** var
- **Data migration** sonrası
- **Database restore** sonrası

## 🔄 Deployment Sonrası Değiştirme

### Seed'i Devre Dışı Bırakma:

1. Render Dashboard → Web Service
2. Environment → `SEED_DATABASE` bulun
3. Value'yi `false` yap veya sil
4. **Manual Deploy** → Deploy latest commit

### Tekrar Seed Etme:

⚠️ **DİKKAT**: Bu mevcut data'yı etkilemez ama duplicate hatalara yol açabilir!

1. Database'i temizle (opsiyonel):

   ```sql
   TRUNCATE users, products, orders CASCADE;
   ```

2. `SEED_DATABASE=true` yap
3. Redeploy

## 📊 Seed Edilen Data

`SEED_DATABASE=true` iken eklenen data:

- 1 Admin kullanıcı
- 3 Demo müşteri
- 5 Kategori
- 10 Ürün (varyantlarla)
- 45+ Ürün varyantı
- 10+ Ürün görseli
- 5 Demo sipariş
- ~10 Ürün yorumu
- 5 Bildirim

**Toplam**: ~100+ kayıt

## 🚨 Önemli Notlar

### 1. Idempotency

Seed script **idempotent değildir**. Tekrar çalıştırırsanız:

- Aynı email'li kullanıcılar skip edilir (ON CONFLICT)
- Aynı slug'lu ürünler **güncellenir**
- Yeni siparişler **eklenir**

### 2. Performance

Seed işlemi **~10-30 saniye** sürer. Deployment süresi uzar ama sadece ilk deployment'ta çalışır.

### 3. Database Size

Demo data yaklaşık **5-10MB** database boyutu ekler.

### 4. Credentials

Tüm demo kullanıcılar için şifre: `Demo123!`

## 🔍 Log'ları Kontrol Etme

Render Dashboard → Logs'da göreceksiniz:

```bash
🚀 Starting Render deployment...
✅ Database URL configured
📊 Initializing database...
✅ Enums created successfully
✅ Sequences created successfully
✅ Database schema pushed successfully
✅ Database initialized successfully
🌱 Seeding database with demo data...
👤 Creating admin user...
✅ Admin user created
👥 Creating demo customers...
✅ Demo customers created
📁 Creating categories...
✅ Categories created
📦 Creating products...
✅ 10 products created
🖼️  Adding product images...
✅ Product images added
🎨 Adding product variants...
✅ Product variants added
🛒 Creating sample orders...
✅ Sample orders created
⭐ Creating sample reviews...
✅ Sample reviews created
🔔 Creating sample notifications...
✅ Sample notifications created
🎉 Database seeding completed successfully!
✅ Database seeding completed
🎯 Starting NestJS application...
```

## 🛠️ Manuel Seed (Production'da)

Eğer production'da manuel seed çalıştırmak isterseniz:

### Render Shell ile:

```bash
# Render Dashboard → Shell
npm run db:seed
```

### Local'den Production'a:

```bash
# .env.production dosyası ile
DATABASE_URL=postgres://... npm run db:seed
```

## 📝 Best Practices

### Development

```yaml
SEED_DATABASE: true
```

### Staging

```yaml
SEED_DATABASE: true
```

### Production

```yaml
# SEED_DATABASE: false (veya variable'ı ekleme)
```

## 🔧 Troubleshooting

### "Database seeding failed"

1. Database boş mu kontrol edin
2. DATABASE_URL doğru mu kontrol edin
3. Enum'lar oluşturuldu mu kontrol edin
4. Log'ları inceleyin

### Duplicate Errors

Normal - ON CONFLICT ile handle ediliyor. Skip ediliyor.

### Seed Atlanıyor

`SEED_DATABASE=true` olduğundan emin olun.

## 🎓 Örnek Workflow

### İlk Deployment:

```
1. Code push ✅
2. Render build başlar ✅
3. Database init ✅
4. SEED_DATABASE=true → Seed çalışır 🌱
5. App başlar ✅
6. Demo data hazır! 🎉
```

### Sonraki Deployments:

```
1. SEED_DATABASE=false yap
2. Code push
3. Render build başlar
4. Database init (skip if exists)
5. Seed atlanır ⏭️
6. App başlar
7. Mevcut data korunur ✅
```

---

**Not**: Bu özellik sadece Render Docker deployments için geçerlidir. Local development'ta manuel `npm run db:seed` kullanın.
