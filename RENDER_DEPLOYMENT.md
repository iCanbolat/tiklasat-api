# 🚀 Render Deployment Rehberi

## 📋 Gereksinimler

Bu proje PostgreSQL 17 ve Docker ile Render'da deploy edilmeye hazır hale getirildi.

## 🔧 Render'da Deploy Etme Adımları

### 1. GitHub Repository'i Hazırlama

```bash
# Repository'yi push etmeyi unutma
git add .
git commit -m "feat: Add Render deployment configuration"
git push origin main
```

### 2. PostgreSQL Database Oluşturma

1. Render Dashboard'a gir: https://dashboard.render.com
2. **"New +"** → **"PostgreSQL"** seç
3. Aşağıdaki ayarları yap:
   - **Name**: `tiklasat-db`
   - **Database**: `ecompanel`
   - **User**: otomatik oluşturulacak
   - **Plan**: Free (ya da ihtiyacına göre)
   - **PostgreSQL Version**: **17** (önemli!)
4. **Create Database** butonuna tıkla

### 3. Web Service Oluşturma

1. Render Dashboard'da **"New +"** → **"Web Service"** seç
2. GitHub repository'ni connect et
3. Aşağıdaki ayarları yap:

#### Basic Settings

- **Name**: `tiklasat-api`
- **Environment**: `Docker`
- **Region**: İstediğin region
- **Plan**: Starter (ya da ihtiyacına göre)

#### Build Settings

- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `.` (root directory)

### 4. Environment Variables Ayarlama

Render'da Web Service ayarlarında **Environment** sekmesine git ve aşağıdaki değişkenleri ekle:

#### 🔗 Database Configuration

```bash
# Database bağlantısı (PostgreSQL service'den al)
DATABASE_URL=postgresql://username:password@hostname:port/database
# Ya da Render otomatik olarak bunu sağlayacak
```

#### 🔐 JWT Configuration

```bash
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_TOKEN_TTL=1d
JWT_REFRESH_TOKEN_TTL=7d
```

#### 💳 Payment Provider (Iyzico)

```bash
IYZICO_API_KEY=your-iyzico-api-key
IYZICO_SECRET_KEY=your-iyzico-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com  # Sandbox için
# IYZICO_BASE_URL=https://api.iyzipay.com       # Production için
```

#### ☁️ Cloudinary (Resim upload için)

```bash
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### 📧 Email Configuration

```bash
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

#### 🌐 CORS Configuration

```bash
CORS_ORIGIN=https://your-frontend-domain.com,https://your-admin-panel.com
NODE_ENV=production
```

### 5. Database Connection Ayarlama

1. PostgreSQL service oluşturduktan sonra **"Connect"** sekmesine git
2. **External Connection String**'i kopyala
3. Web Service'de `DATABASE_URL` environment variable'ı olarak ekle

**Ya da** Render otomatik bağlantı için:

1. Web Service ayarlarında **"Environment"** → **"Add Environment Variable"**
2. **"Add from Database"** seç
3. Oluşturduğun PostgreSQL database'i seç
4. `DATABASE_URL` olarak ekle

## 🔍 Deployment'ı Test Etme

### 1. Build Logları Kontrol Et

- Render Dashboard'da build loglarını takip et
- Docker build sürecinin başarılı olduğundan emin ol

### 2. Health Check

Deploy tamamlandıktan sonra:

```bash
curl https://your-app-name.onrender.com/health
```

Yanıt:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 3. API Documentation

Swagger docs'a erişim:

```
https://your-app-name.onrender.com/api/docs
```

### 4. Database Migration

Uygulama başlarken otomatik olarak migration çalışacak. Logları kontrol et:

- "📊 Running database migrations..."
- "✅ Database migrations completed successfully"

## 🚨 Troubleshooting

### Build Hataları

- Docker build loglarını kontrol et
- `package.json` dependencies'lerini kontrol et
- Environment variables'ların doğru set edildiğinden emin ol

### Database Connection Hataları

- PostgreSQL service'in running durumda olduğunu kontrol et
- `DATABASE_URL` format'ını kontrol et
- SSL ayarlarını kontrol et (Render otomatik SSL kullanır)

### Migration Hataları

- Database schema'larının export edildiğinden emin ol
- `drizzle.config.ts` ayarlarını kontrol et
- Database permissions'larını kontrol et

## 📊 Monitoring

### Performance

- Render Dashboard'da response time ve resource usage'ı takip et
- Health check endpoint'i ile service health'ini monitor et

### Logs

- Render Dashboard'da real-time logları görüntüle
- Application logları ile database connection'ları takip et

## 🔄 Güncelleme

Kod değişikliklerinden sonra:

1. Git push yap
2. Render otomatik olarak yeniden deploy eder
3. Zero-downtime deployment sağlanır

## 📋 Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `JWT_TOKEN_TTL` - Token expiration
- [ ] `IYZICO_API_KEY` - Payment provider key
- [ ] `IYZICO_SECRET_KEY` - Payment provider secret
- [ ] `IYZICO_BASE_URL` - Payment provider endpoint
- [ ] `CLOUDINARY_CLOUD_NAME` - Image upload service
- [ ] `CLOUDINARY_API_KEY` - Image upload key
- [ ] `CLOUDINARY_API_SECRET` - Image upload secret
- [ ] `CORS_ORIGIN` - Allowed frontend domains
- [ ] `NODE_ENV=production` - Environment mode

Bu rehberi takip ederek projenizi başarıyla Render'da deploy edebilirsiniz! 🎉
