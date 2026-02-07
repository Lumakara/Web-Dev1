# 📋 Environment Setup Guide - Layanan Digital

Panduan lengkap untuk mengkonfigurasi environment variables aplikasi Layanan Digital.

---

## 🚀 Quick Start

```bash
# 1. Copy file environment
cp .env.example .env

# 2. Edit file .env dengan editor favorit Anda
nano .env

# 3. Isi semua konfigurasi yang diperlukan

# 4. Restart development server
npm run dev
```

---

## 🔥 Konfigurasi WAJIB

### 1. Firebase Configuration

**Mengapa Diperlukan:** Untuk autentikasi, database, dan storage.

**Cara Mendapatkan:**
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Buat project baru atau pilih project existing
3. Klik ikon gear ⚙️ → **Project Settings**
4. Di tab **General**, scroll ke bagian **Your Apps**
5. Pilih aplikasi web atau buat baru
6. Copy nilai-nilai yang muncul

**Contoh:**
```env
VITE_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=layanan-digital-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=layanan-digital-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=layanan-digital-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxxxxx
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**⚠️ Catatan:**
- Setelah setup, konfigurasi **Firestore Security Rules**
- Enable **Email/Password** dan **Google** di Authentication → Sign-in method

---

### 2. Pakasir Payment Gateway

**Mengapa Diperlukan:** Untuk memproses pembayaran QRIS, Virtual Account, dll.

**Cara Mendapatkan:**
1. Daftar di [Pakasir](https://pakasir.com)
2. Buat project baru
3. Masuk ke **Project Settings**
4. Copy **API Key**
5. Project slug ada di URL: `https://app.pakasir.com/pay/PROJECT_SLUG`

**Contoh:**
```env
VITE_PAKASIR_API_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_PAKASIR_PROJECT_SLUG=layanan-digital-store
VITE_PAKASIR_SANDBOX=true  # Set false untuk production
```

**💡 Tips:**
- Gunakan sandbox mode saat development
- Test dengan berbagai metode pembayaran
- Set webhook URL di dashboard Pakasir

---

### 3. EmailJS Configuration

**Mengapa Diperlukan:** Untuk mengirim email notifikasi ke pengguna.

**Cara Mendapatkan:**
1. Daftar di [EmailJS](https://www.emailjs.com/)
2. Buat **Email Service** (Gmail, Outlook, dll)
3. Buat **Email Template** (gunakan template dari `emailjs-templates.html`)
4. Copy **Public Key** dari Account → API Keys
5. Copy **Service ID** dan **Template ID**

**Contoh:**
```env
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxxx
VITE_EMAILJS_SERVICE_ID=service_xxxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxx
```

**📧 Template yang Tersedia:**
- `emailjs-templates.html` - Template siap pakai untuk:
  - Auto Reply Contact Us
  - Admin Notification
  - Welcome Email

---

## 🤖 Konfigurasi Opsional (Tapi Direkomendasikan)

### 4. Telegram Bot

**Mengapa Diperlukan:** Notifikasi real-time untuk admin.

**Cara Mendapatkan:**
1. Buka Telegram dan cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi dan copy **HTTP API token**
4. Untuk Chat ID:
   - Cari **@userinfobot** di Telegram
   - Copy ID yang muncul

**Contoh:**
```env
VITE_TELEGRAM_BOT_TOKEN=1234567890:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_TELEGRAM_CHAT_ID=123456789
```

**✅ Fitur Notifikasi:**
- Login/Logout user
- Checkout baru
- Pembayaran sukses
- Tiket support baru
- User registrasi baru

---

### 5. OpenAI API (AI Chatbot)

**Mengapa Diperlukan:** Chatbot yang lebih cerdas dengan AI.

**Cara Mendapatkan:**
1. Buat akun di [OpenAI](https://platform.openai.com)
2. Buka [API Keys](https://platform.openai.com/api-keys)
3. Klik **"Create new secret key"**
4. **⚠️ Copy segera** - hanya ditampilkan sekali!

**Contoh:**
```env
VITE_AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_MODEL=gpt-3.5-turbo
```

**💡 Catatan:**
- Jika tidak diisi, chatbot tetap berfungsi dengan fallback responses
- Gunakan model `gpt-4` untuk respons lebih baik (tapi lebih mahal)

---

### 6. Pterodactyl Panel (VPS/Game Server)

**Mengapa Diperlukan:** Auto-provisioning server setelah pembelian.

**Cara Mendapatkan:**
1. Login ke panel admin Pterodactyl
2. Buka **Account Settings** → **API Credentials**
3. Buat API Key baru
4. Untuk Application API, perlu akses admin panel

**Contoh:**
```env
VITE_PTERODACTYL_URL=https://panel.yourdomain.com
VITE_PTERODACTYL_CLIENT_API_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_PTERODACTYL_APP_API_KEY=ptlc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 7. Google reCAPTCHA

**Mengapa Diperlukan:** Melindungi form dari spam/bot.

**Cara Mendapatkan:**
1. Buka [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Buat site baru
3. Pilih **reCAPTCHA v3**
4. Copy **Site Key**

**Contoh:**
```env
VITE_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🏪 Konfigurasi Toko

### Informasi Dasar

```env
VITE_STORE_NAME=Layanan Digital
VITE_STORE_SHORT_NAME=LD
VITE_STORE_TAGLINE="Solusi Digital Profesional untuk Anda"
VITE_STORE_DESCRIPTION="Platform layanan digital terpercaya..."
```

### Kontak

```env
VITE_COMPANY_OWNER_NAME=Nama Owner
VITE_COMPANY_PHONE=088992222666
VITE_COMPANY_WHATSAPP=6288992222666
VITE_COMPANY_EMAIL=support@layanandigital.id
VITE_COMPANY_ADDRESS="Jl. Digital No. 123, Jakarta, Indonesia"
```

### Media Sosial

```env
VITE_SOCIAL_FACEBOOK=https://facebook.com/layanandigital
VITE_SOCIAL_INSTAGRAM=https://instagram.com/layanandigital
VITE_SOCIAL_TWITTER=https://twitter.com/layanandigital
VITE_SOCIAL_WHATSAPP=https://wa.me/6288992222666
```

---

## 💰 Konfigurasi Pembayaran

```env
# PPN dalam desimal (1.2% = 0.012)
VITE_PAYMENT_PPN_RATE=0.012

# Biaya admin tetap dalam Rupiah
VITE_PAYMENT_ADMIN_FEE=5500

# Minimum dan maximum order
VITE_PAYMENT_MIN_ORDER=10000
VITE_PAYMENT_MAX_ORDER=10000000

# Metode pembayaran default
VITE_PAYMENT_DEFAULT_METHOD=qris
```

---

## 🎨 Konfigurasi Tema

```env
# Warna dalam HEX tanpa #
VITE_THEME_PRIMARY=3B82F6      # Biru
VITE_THEME_SECONDARY=F97316    # Oranye
VITE_THEME_ACCENT=8B5CF6       # Ungu
VITE_THEME_SUCCESS=10B981      # Hijau
VITE_THEME_WARNING=F59E0B      # Kuning
VITE_THEME_ERROR=EF4444        # Merah
```

---

## ⚙️ Feature Flags

Aktifkan/nonaktifkan fitur dengan `true` atau `false`:

```env
VITE_FEATURE_REGISTRATION=true
VITE_FEATURE_GUEST_CHECKOUT=true
VITE_FEATURE_REVIEWS=true
VITE_FEATURE_CHATBOT=true
VITE_FEATURE_WISHLIST=true
VITE_FEATURE_LIVE_CHAT=true

# Fitur yang memerlukan konfigurasi tambahan
VITE_FEATURE_PTERODACTYL=false      # Aktifkan jika Pterodactyl sudah dikonfigurasi
VITE_FEATURE_AI_CHATBOT=false       # Aktifkan jika OpenAI sudah dikonfigurasi
```

---

## 🔒 Keamanan

### Best Practices

1. **Jangan commit file .env**
   ```bash
   # Pastikan .env ada di .gitignore
   echo ".env" >> .gitignore
   ```

2. **Backup file .env**
   - Simpan copy di tempat aman
   - Gunakan password manager untuk API keys

3. **Rotasi API Keys**
   - Ganti keys setiap 3-6 bulan
   - Revoke keys yang tidak digunakan

4. **Environment Terpisah**
   - Development: `.env.development`
   - Production: `.env.production`

---

## 🐛 Troubleshooting

### Masalah Umum

**1. Firebase Error: "API Key tidak valid"**
- ✅ Pastikan semua nilai Firebase diisi dengan benar
- ✅ Cek tidak ada spasi di awal/akhir
- ✅ Pastikan project Firebase sudah di-enable

**2. Pakasir Payment Gagal**
- ✅ Cek API Key benar
- ✅ Pastikan sandbox mode sesuai environment
- ✅ Cek project slug (case-sensitive)

**3. Email Tidak Terkirim**
- ✅ Verifikasi EmailJS public key
- ✅ Cek service ID dan template ID
- ✅ Pastikan template email sudah dibuat

**4. Telegram Bot Tidak Berfungsi**
- ✅ Cek bot token lengkap (termasuk bagian sebelum :)
- ✅ Pastikan bot sudah di-start
- ✅ Cek chat ID benar

---

## 📊 Environment Variables Lengkap

Lihat file `.env.example` untuk daftar lengkap semua environment variables yang tersedia.

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah:

1. Cek console browser untuk error messages
2. Verifikasi semua API keys masih aktif
3. Test setiap service satu per satu
4. Hubungi support jika masalah berlanjut

---

**Terakhir Diupdate:** 2024
**Versi:** 1.0.0
