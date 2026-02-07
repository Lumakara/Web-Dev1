# Firebase Setup Guide

Panduan lengkap untuk setup Firebase Authentication dan Firestore Database.

---

## 1. Buat Project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add project"**
3. Masukkan nama project (contoh: `layanan-digital-app`)
4. Pilih/Create Google Analytics account (opsional)
5. Klik **"Create project"**
6. Tunggu sampai project selesai dibuat

---

## 2. Dapatkan Konfigurasi Firebase

1. Di dashboard Firebase, klik ikon **"</>"** (Add Firebase to your web app)
2. Daftarkan aplikasi dengan nama (contoh: `Layanan Digital Web`)
3. Centang **"Also set up Firebase Hosting"** (opsional)
4. Klik **"Register app"**
5. Copy config yang muncul, contoh:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

6. Isi file `.env` dengan nilai-nilai tersebut:

```bash
VITE_FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

---

## 3. Setup Firebase Authentication

1. Di sidebar kiri, klik **"Authentication"**
2. Klik **"Get started"**
3. Aktifkan metode sign-in:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → Pilih email support → Save

---

## 4. Setup Firestore Database

### 4.1 Buat Database

1. Di sidebar kiri, klik **"Firestore Database"**
2. Klik **"Create database"**
3. Pilih mode: **"Start in production mode"** atau **"Start in test mode"** (untuk development)
4. Pilih lokasi terdekat (contoh: `asia-southeast1` untuk Indonesia/Singapore)
5. Klik **"Enable"**

### 4.2 Setup Security Rules

1. Klik tab **"Rules"**
2. Ganti rules dengan kode berikut:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products - public read, admin write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Orders - users can read their own, authenticated users can create
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource == null || resource.data.user_id == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null;
    }
    
    // Support tickets
    match /support_tickets/{ticketId} {
      allow read: if request.auth != null && 
        (resource == null || resource.data.user_id == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

3. Klik **"Publish"**

---

## 5. Buat Collections (Struktur Data)

Firestore menggunakan struktur collection-document. Berikut struktur yang dibutuhkan:

### 5.1 Collection: `products`

Contoh document:
```json
{
  "id": "wifi",
  "title": "Wi-Fi Installation Service",
  "category": "installation",
  "base_price": 89000,
  "discount_price": 79000,
  "stock": 100,
  "image": "https://images.unsplash.com/...",
  "icon": "https://images.unsplash.com/...",
  "rating": 4.8,
  "reviews": 156,
  "duration": "2-3 jam",
  "description": "Pemasangan dan konfigurasi jaringan wireless...",
  "tags": ["network", "internet", "setup"],
  "tiers": [
    {
      "name": "Basic",
      "price": 89000,
      "features": ["Setup 1 router", "Konfigurasi dasar", "Optimasi kecepatan"]
    },
    {
      "name": "Standard",
      "price": 149000,
      "features": ["Setup mesh network", "Keamanan advanced", "Optimasi multi device"]
    }
  ],
  "related": ["vps", "code"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 5.2 Collection: `profiles`

Contoh document (auto-created saat user register):
```json
{
  "id": "user_uid_here",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "is_admin": false,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 5.3 Collection: `orders`

Contoh document:
```json
{
  "id": "auto_generated_id",
  "user_id": "user_uid_here",
  "items": [
    {
      "product_id": "wifi",
      "title": "Wi-Fi Installation Service",
      "tier": "Basic",
      "price": 89000,
      "quantity": 1
    }
  ],
  "total_amount": 89000,
  "status": "pending",
  "payment_method": "QRIS",
  "payment_reference": "ORDER-1234567890",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 5.4 Collection: `support_tickets`

Contoh document:
```json
{
  "id": "auto_generated_id",
  "user_id": "user_uid_here",
  "subject": "Pertanyaan tentang Wi-Fi",
  "category": "Teknis",
  "email": "user@example.com",
  "description": "Saya ingin bertanya tentang...",
  "status": "open",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

---

## 6. Tambahkan Index Firestore (Opsional)

Untuk query yang lebih kompleks, tambahkan index:

1. Di Firestore Database, klik tab **"Indexes"**
2. Klik **"Add index"**
3. Collection: `orders`
4. Fields to index:
   - `user_id` (Ascending)
   - `created_at` (Descending)
5. Klik **"Create index"**

Ulangi untuk collection `support_tickets`.

---

## 7. Jalankan Aplikasi

Setelah semua setup selesai:

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Atau build untuk production
npm run build
```

---

## Troubleshooting

### Error: "Permission denied"
- Cek Firestore security rules
- Pastikan user sudah login

### Error: "API key not valid"
- Pastikan API key di `.env` benar
- Restart development server setelah edit `.env`

### Data tidak tampil
- Cek browser console untuk error
- Pastikan collections sudah dibuat di Firestore
- Cek network tab untuk request yang gagal

### Firebase Auth tidak berfungsi
- Pastikan Authentication sudah di-enable
- Cek domain aplikasi sudah di-authorized (untuk production)

---

## Catatan Penting

1. **JANGAN** commit file `.env` ke repository publik
2. **JANGAN** expose API key di kode frontend yang bisa diakses publik (gunakan environment variables)
3. Untuk production, pastikan security rules lebih strict
4. Enable App Check untuk keamanan tambahan (opsional)
