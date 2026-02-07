# 📋 MANUAL SETUP GUIDE

Panduan lengkap setup dan deployment **Layanan Digital Platform** untuk production.

---

## 📑 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Firebase Setup](#-firebase-setup)
3. [Pakasir Payment Gateway Setup](#-pakasir-payment-gateway-setup)
4. [Telegram Bot Setup (Optional)](#-telegram-bot-setup-optional)
5. [Environment Configuration](#-environment-configuration)
6. [Security Rules](#-security-rules)
7. [Build & Deploy](#-build--deploy)
8. [Post-Deployment Checklist](#-post-deployment-checklist)

---

## ✅ Prerequisites

Sebelum mulai, pastikan Anda memiliki:

- [ ] **Node.js** 18+ installed (`node -v`)
- [ ] **npm** atau **yarn** installed
- [ ] **Git** installed
- [ ] Akun **Google** untuk Firebase
- [ ] Akun **Pakasir** untuk payment gateway
- [ ] Domain (untuk production)

### Install Node.js (jika belum)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18

# Windows
download dari https://nodejs.org/
```

---

## 🔥 Firebase Setup

### Step 1: Create Firebase Project

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add project"**
3. Isi **Project name**: `layanan-digital-prod`
4. Disable Google Analytics (atau enable jika perlu)
5. Klik **"Create project"**
6. Tunggu sampai project siap

### Step 2: Register Web App

1. Di Firebase Console, klik icon **</>** (Web)
2. **App nickname**: `layanan-digital-web`
3. Check **"Also set up Firebase Hosting"** (optional)
4. Klik **"Register app"**
5. Copy konfigurasi Firebase (akan digunakan di `.env`)

### Step 3: Enable Authentication

1. Di sidebar, klik **"Authentication"**
2. Klik **"Get started"**
3. Enable **Email/Password** provider:
   - Toggle ke **Enabled**
   - Save

### Step 4: Create Firestore Database

1. Di sidebar, klik **"Firestore Database"**
2. Klik **"Create database"**
3. Pilih **"Start in production mode"**
4. Pilih region terdekat (asia-southeast1 untuk Indonesia)
5. Klik **"Enable"**

### Step 5: Setup Storage (untuk upload gambar)

1. Di sidebar, klik **"Storage"**
2. Klik **"Get started"**
3. Pilih **"Start in production mode"**
4. Pilih region yang sama
5. Klik **"Done"**

---

## 💳 Pakasir Payment Gateway Setup

### Step 1: Register Akun

1. Buka [Pakasir.com](https://pakasir.com)
2. Klik **"Daftar"** atau **"Login"**
3. Isi data yang diperlukan
4. Verifikasi email

### Step 2: Create Project

1. Login ke dashboard Pakasir
2. Klik **"Buat Proyek Baru"**
3. Isi:
   - **Nama Proyek**: `Layanan Digital`
   - **Slug**: `layanan-digital` (ini yang akan digunakan di URL)
   - **Website URL**: `https://your-domain.com`
   - **Webhook URL**: `https://your-domain.com/api/webhook/pakasir`
4. Klik **"Simpan"**

### Step 3: Get API Credentials

1. Buka detail proyek yang baru dibuat
2. Copy **API Key** (biasanya format: `pak_xxxxxxxxxx`)
3. Copy **Project Slug** (e.g., `layanan-digital`)
4. Note: Ada mode **Sandbox** dan **Production**

### Step 4: Setup Webhook (Untuk notifikasi pembayaran)

1. Di project settings, cari field **Webhook URL**
2. Masukkan: `https://your-domain.com/api/webhook/pakasir`
3. Save settings

### Step 5: Test di Sandbox

1. Pastikan mode project masih **Sandbox**
2. Gunakan API key sandbox untuk testing
3. Setelah testing berhasil, switch ke **Production**

---

## 🤖 Telegram Bot Setup (Optional)

### Step 1: Create Bot

1. Buka Telegram, search **@BotFather**
2. Start chat, kirim: `/newbot`
3. Isi **name**: `Layanan Digital Notifications`
4. Isi **username**: `layanandigital_bot` (harus unik, ends with _bot)
5. Copy **HTTP API Token** (format: `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`)

### Step 2: Get Chat ID

1. Search **@userinfobot** di Telegram
2. Start chat
3. Bot akan reply dengan info termasuk **ID** (e.g., `123456789`)
4. Copy ID tersebut

### Step 3: Test Bot

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message from Layanan Digital"
```

---

## ⚙️ Environment Configuration

### Step 1: Copy Environment File

```bash
cd layanan-digital
cp .env.example .env
```

### Step 2: Edit .env File

Buka file `.env` dan isi semua nilai:

```bash
# Firebase (dari Firebase Console > Project Settings)
VITE_FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=layanan-digital-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=layanan-digital-prod
VITE_FIREBASE_STORAGE_BUCKET=layanan-digital-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Pakasir (dari dashboard Pakasir)
VITE_PAKASIR_API_KEY=pak_live_xxxxxxxxxxxxx
VITE_PAKASIR_PROJECT_SLUG=layanan-digital
VITE_PAKASIR_SANDBOX=false

# Telegram (optional)
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
VITE_TELEGRAM_CHAT_ID=123456789

# App
VITE_APP_NAME=Layanan Digital
VITE_APP_URL=https://your-domain.com
VITE_SUPPORT_EMAIL=support@your-domain.com
VITE_SUPPORT_WHATSAPP=6281234567890
```

### Step 3: Validate Environment

```bash
# Check if .env is loaded
npm run dev

# Should start without "configuration missing" errors
```

---

## 🔒 Security Rules

### Firestore Security Rules

1. Buka Firebase Console > Firestore Database > Rules
2. Ganti rules dengan berikut:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isAdmin();
    }

    // Orders collection
    match /orders/{orderId} {
      allow read: if isAuthenticated() && 
        (resource.data.user_id == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
        request.resource.data.user_id == request.auth.uid;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Products collection (read-only for public)
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Admins collection
    match /admins/{userId} {
      allow read: if isAuthenticated() && 
        (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }

    // Tickets/Support
    match /tickets/{ticketId} {
      allow read: if isAuthenticated() && 
        (resource.data.user_id == request.auth.uid || isAdmin());
      allow create: if isAuthenticated();
      allow update: if isAdmin();
    }
  }
}
```

3. Klik **"Publish"**

### Storage Security Rules

1. Buka Firebase Console > Storage > Rules
2. Ganti rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User avatars
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024 // 2MB max
                   && request.resource.contentType.matches('image/.*');
    }

    // Product images (admin only)
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
                   && request.resource.size < 5 * 1024 * 1024 // 5MB max
                   && request.resource.contentType.matches('image/.*');
    }

    // General uploads
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
  }
}
```

3. Klik **"Publish"**

---

## 🏗️ Build & Deploy

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Tests

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build test
npm run build
```

### Step 3: Build Production

```bash
npm run build
```

Output akan ada di folder `dist/`

### Step 4: Deploy Options

#### Option A: Deploy ke Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: Deploy ke Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Option C: Deploy ke Firebase Hosting

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Init hosting (jika belum)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

#### Option D: Manual Deploy (Shared Hosting/VPS)

```bash
# Build
npm run build

# Upload ke server via FTP/SCP
# Upload folder dist/ ke public_html atau www

# Contoh dengan SCP:
scp -r dist/* user@your-server.com:/var/www/html/
```

### Step 5: Configure Custom Domain

#### Vercel:
1. Dashboard > Project > Settings > Domains
2. Add domain dan ikuti instruksi DNS

#### Netlify:
1. Dashboard > Site settings > Domain management
2. Add custom domain

#### Firebase:
1. Console > Hosting > Add custom domain
2. Ikuti instruksi verifikasi

---

## ✅ Post-Deployment Checklist

### Functionality Testing

- [ ] Homepage loads correctly
- [ ] Products display properly
- [ ] Add to cart works
- [ ] Cart persistence works (refresh page)
- [ ] Checkout flow works
- [ ] Payment gateway redirects correctly
- [ ] Payment webhook receives notifications
- [ ] User registration works
- [ ] User login works
- [ ] Profile page works
- [ ] Order history displays
- [ ] Admin dashboard accessible
- [ ] Dark mode toggle works
- [ ] Mobile responsive works

### Security Testing

- [ ] HTTPS is active
- [ ] API keys are not exposed in frontend
- [ ] Authentication required for protected routes
- [ ] Firestore rules prevent unauthorized access
- [ ] File uploads have size limits
- [ ] Form validation works

### Performance Testing

- [ ] Page load time < 3 seconds
- [ ] Images are optimized
- [ ] Lighthouse score > 80
- [ ] PWA install prompt works
- [ ] Offline functionality works (if enabled)

### SEO & Analytics

- [ ] Meta tags are correct
- [ ] robots.txt exists
- [ ] sitemap.xml submitted to Google
- [ ] Google Analytics connected (optional)
- [ ] Facebook Pixel connected (optional)

---

## 🐛 Troubleshooting

### Build Errors

```bash
# Error: TypeScript compilation failed
npx tsc --noEmit

# Error: Module not found
rm -rf node_modules
rm package-lock.json
npm install

# Error: Out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Runtime Errors

**Error: Firebase config missing**
- Check `.env` file exists
- Check all VITE_FIREBASE_* variables filled
- Restart dev server

**Error: Pakasir payment failed**
- Check VITE_PAKASIR_API_KEY
- Verify project slug is correct
- Check if sandbox mode matches environment

**Error: CORS issues**
- Add your domain to Firebase authorized domains
- Check Pakasir webhook URL is correct

### Common Issues

**Images not loading:**
```bash
# Check storage rules allow public read
# Verify image URLs are correct
```

**Payments not updating:**
```bash
# Check webhook URL is accessible
# Verify SSL certificate is valid
# Check Pakasir webhook logs
```

---

## 📞 Support

Jika mengalami masalah:

1. Check [Issues](https://github.com/username/layanan-digital/issues)
2. Email: support@your-domain.com
3. WhatsApp: 6281234567890

---

**Selamat! 🎉 Website Anda sekarang live dan siap menerima pesanan!**
