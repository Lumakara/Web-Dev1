# 🚀 SUPABASE SETUP & MIGRATION GUIDE
## Pindah dari Firebase ke Supabase

---

## 📋 DAFTAR ISI
1. [Setup Supabase Project](#1-setup-supabase-project)
2. [Konfigurasi Environment](#2-konfigurasi-environment)
3. [Setup Database Schema](#3-setup-database-schema)
4. [Konfigurasi Auth Providers](#4-konfigurasi-auth-providers)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Verifikasi Setup](#6-verifikasi-setup)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. SETUP SUPABASE PROJECT

### Step 1: Buat Akun Supabase
1. Buka https://supabase.com
2. Klik "Start your project"
3. Sign up dengan GitHub atau email
4. Verifikasi email Anda

### Step 2: Buat New Project
1. Klik "New Project"
2. Pilih Organization (default: personal)
3. Isi informasi project:
   - **Name**: `layanan-digital` (atau nama lain)
   - **Database Password**: Buat password kuat (simpan dengan aman!)
   - **Region**: Pilih `Southeast Asia (Singapore)` untuk latency terbaik
4. Klik "Create new project"
5. Tunggu 2-3 menit sampai project ready

### Step 3: Get API Credentials
1. Di dashboard project, klik **Settings** (icon gear)
2. Pilih tab **API**
3. Copy nilai berikut:
   - **Project URL** (contoh: `https://abc123xyz.supabase.co`)
   - **anon public** API Key (panjang, mulai dengan `eyJ...`)

---

## 2. KONFIGURASI ENVIRONMENT

### Update File `.env`

Tambahkan variabel berikut ke file `.env` Anda:

```bash
# ============================================
# SUPABASE CONFIGURATION (WAJIB)
# ============================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Contoh:
# VITE_SUPABASE_URL=https://abc123xyz.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Catatan Penting:**
- Jangan gunakan `Service Role Key` di frontend! Hanya gunakan `anon public`
- Jangan commit file `.env` ke git
- Backup credentials di tempat aman

---

## 3. SETUP DATABASE SCHEMA

### Step 1: Buka SQL Editor
1. Di Supabase dashboard, klik **SQL Editor** (sidebar kiri)
2. Klik **New query**

### Step 2: Create Profiles Table

Copy dan paste SQL berikut, lalu klik **Run**:

```sql
-- Create profiles table untuk user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

### Step 3: Create Products Table (Optional)

Jika ingin simpan products di Supabase (bukan hanya Firebase):

```sql
-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  discount_price INTEGER,
  stock INTEGER DEFAULT 0,
  image TEXT,
  icon TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews INTEGER DEFAULT 0,
  duration TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  tiers JSONB DEFAULT '[]',
  related TEXT[] DEFAULT '{}',
  requires_form BOOLEAN DEFAULT false,
  form_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can read products
CREATE POLICY "Anyone can view products" 
  ON public.products FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Only admins can modify products
CREATE POLICY "Only admins can insert products" 
  ON public.products FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Only admins can update products" 
  ON public.products FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));
```

### Step 4: Create Orders Table (Optional)

```sql
-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  installation_details JSONB,
  panel_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view own orders
CREATE POLICY "Users can view own orders" 
  ON public.orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create own orders
CREATE POLICY "Users can create own orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update own orders
CREATE POLICY "Users can update own orders" 
  ON public.orders FOR UPDATE 
  USING (auth.uid() = user_id);
```

### Step 5: Create Function for Updated At

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON public.products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. KONFIGURASI AUTH PROVIDERS

### Enable Email/Password Auth

1. Di Supabase dashboard, klik **Authentication** (sidebar kiri)
2. Pilih tab **Providers**
3. Pastikan **Email** provider **Enabled**
4. Konfigurasi:
   - ✅ Enable Email confirmations (recommended untuk production)
   - ✅ Secure email change
   - ✅ Secure password change
   - ⏱️ JWT expiry: 3600 (default)
   - ⏱️ Refresh token expiry: 604800 (default)

### Enable Google OAuth

1. Di tab **Providers**, cari **Google**
2. Toggle **Enabled**
3. Anda perlu Google OAuth credentials:

#### Setup Google OAuth:
1. Buka https://console.cloud.google.com
2. Buat project baru atau pilih existing
3. Pergi ke **APIs & Services** > **Credentials**
4. Klik **Create Credentials** > **OAuth client ID**
5. Configure consent screen:
   - User Type: External
   - App name: Layanan Digital
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
6. Create OAuth client ID:
   - Application type: Web application
   - Name: Layanan Digital Web
   - Authorized redirect URIs: `https://your-project-id.supabase.co/auth/v1/callback`
7. Copy **Client ID** dan **Client Secret**
8. Paste ke Supabase Google provider settings
9. Klik **Save**

---

## 5. ROW LEVEL SECURITY (RLS)

### Pentingnya RLS

RLS (Row Level Security) memastikan:
- User hanya bisa akses data mereka sendiri
- Data tidak bisa diakses oleh user lain
- Protection di database level

### Verifikasi RLS Enabled

1. Di Supabase, klik **Database** > **Tables**
2. Pastikan semua tables memiliki **RLS** = ✅

### Testing RLS

Buka SQL Editor dan test:

```sql
-- Test: Coba akses profiles tanpa auth (harus gagal)
SELECT * FROM public.profiles;

-- Test: Coba akses dengan auth (harus berhasil untuk user sendiri)
-- Ini akan otomatis work di aplikasi yang sudah login
```

---

## 6. VERIFIKASI SETUP

### Test 1: Check Environment Variables

Di aplikasi Anda, jalankan di browser console:

```javascript
// Check Supabase config
import('@/lib/supabase').then(m => {
  console.log('Supabase config:', m.SupabaseAuth.getStatus());
});
```

**Expected output:**
```
{
  isConfigured: true,
  isConnected: true,
  url: "https://your-project-id.supabase.co",
  error: null
}
```

### Test 2: Test Authentication

```javascript
// Test Supabase connection
import('@/lib/supabase').then(m => {
  m.testSupabaseConnection().then(console.log);
});
```

**Expected output:**
```
{
  success: true,
  configured: true,
  authenticated: false,  // atau true jika sudah login
  message: "Terhubung ke Supabase..."
}
```

### Test 3: Test Registration

1. Buka halaman `/auth`
2. Klik "Daftar"
3. Isi form dengan email valid
4. Klik "Daftar"
5. **Expected:** Toast sukses atau redirect ke verifikasi email

### Test 4: Test Login

1. Buka halaman `/auth`
2. Masukkan email dan password
3. Klik "Masuk"
4. **Expected:** Redirect ke home, nama user muncul di header

### Test 5: Test Google OAuth

1. Buka halaman `/auth`
2. Klik "Login dengan Google"
3. **Expected:** Redirect ke Google consent screen
4. Setelah authorize, kembali ke aplikasi dan sudah login

---

## 7. TROUBLESHOOTING

### Error: "Supabase tidak terkonfigurasi"

**Penyebab:** Environment variables tidak terbaca

**Solusi:**
1. Cek `.env` file ada dan isi benar
2. Pastikan prefix `VITE_` ada (penting untuk Vite!)
3. Restart dev server: `npm run dev`
4. Cek console untuk detail error

### Error: "Invalid API key"

**Penyebab:** Salah copy API key atau menggunakan Service Role Key

**Solusi:**
1. Pastikan menggunakan `anon public` key (bukan service_role)
2. API key harus panjang (100+ karakter)
3. Cek tidak ada spasi di awal/akhir

### Error: "Email not confirmed"

**Penyebab:** Email confirmation diaktifkan tapi user belum konfirmasi

**Solusi:**
1. Cek inbox email (termasuk spam)
2. Klik link konfirmasi
3. Atau disable email confirmation di Supabase Auth settings (dev only)

### Error: "Row level security violation"

**Penyebab:** RLS policy tidak benar

**Solusi:**
1. Cek policies sudah dibuat (lihat step 3)
2. Cek user sudah login
3. Cek query menggunakan `auth.uid()` dengan benar

### Error: "Database connection failed"

**Penyebab:** Project belum fully provisioned atau paused

**Solusi:**
1. Cek project status di Supabase dashboard
2. Jika paused, klik "Restore"
3. Tunggu 1-2 menit
4. Cek kembali

### Google OAuth Error: "redirect_uri_mismatch"

**Penyebab:** Redirect URI tidak sesuai

**Solusi:**
1. Cek Google Cloud Console > Credentials
2. Pastikan redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Pastikan tidak ada trailing slash
4. Tunggu 5 menit untuk propagasi

---

## 📊 PERBANDINGAN FIREBASE vs SUPABASE

| Fitur | Firebase | Supabase |
|-------|----------|----------|
| **Auth** | ✅ Mudah | ✅ Mudah, lebih fleksibel |
| **Database** | Firestore (NoSQL) | PostgreSQL (SQL) |
| **Realtime** | ✅ Realtime DB | ✅ Realtime subscriptions |
| **Self-hosted** | ❌ Tidak | ✅ Bisa |
| **Open Source** | ❌ Tidak | ✅ 100% |
| **Pricing** | Pay as you go | Generous free tier |
| **Query** | Terbatas | Full SQL power |
| **RLS** | Firestore Rules | PostgreSQL RLS |

---

## ✅ CHECKLIST SETUP

- [ ] Buat project di Supabase
- [ ] Copy Project URL dan Anon Key
- [ ] Tambah ke `.env` file
- [ ] Setup database schema (profiles, products, orders)
- [ ] Enable RLS untuk semua tables
- [ ] Create RLS policies
- [ ] Enable Email auth provider
- [ ] Setup Google OAuth (optional)
- [ ] Test registrasi email
- [ ] Test login email
- [ ] Test login Google (jika diaktifkan)
- [ ] Verifikasi RLS bekerja

---

## 🚀 DEPLOYMENT

Setelah setup selesai:

```bash
# Build project
npm run build

# Deploy ke Vercel
vercel --prod
```

---

## 📞 NEED HELP?

Jika ada masalah:

1. **Supabase Docs**: https://supabase.com/docs
2. **Supabase Discord**: https://discord.gg/supabase
3. **GitHub Issues**: https://github.com/supabase/supabase

---

**Setup selesai!** 🎉 Sekarang autentikasi Anda menggunakan Supabase yang lebih stabil dan terpercaya.
