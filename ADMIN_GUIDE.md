# Panduan Admin Dashboard

## 📍 Akses Admin Dashboard

Admin Dashboard dapat diakses melalui:
- URL: `https://your-domain.com/admin` atau `http://localhost:5173/admin`
- Link di Sidebar: Klik menu "Admin Dashboard"

## 🔐 Kredensial Login

### Default Admin Account
```
Email: admin@lumakara.com
Password: admin123
Role: Super Admin
```

### Additional Admin Accounts (untuk testing)

#### Manager Account
```
Email: manager@lumakara.com
Password: manager123
Role: Admin
Permissions: products, orders, tickets, analytics
```

#### Moderator Account
```
Email: moderator@lumakara.com
Password: mod123
Role: Moderator
Permissions: view only (products:view, orders:view, tickets:view)
```

## 👥 Role-Based Access Control

### Roles & Permissions

| Role | Deskripsi | Permissions |
|------|-----------|-------------|
| **Super Admin** | Full access ke semua fitur | `all` |
| **Admin** | Mengelola konten dan pesanan | `products:*`, `orders:*`, `tickets:*`, `analytics:view` |
| **Moderator** | View-only access | `products:view`, `orders:view`, `tickets:view` |

### Permission Structure
- `all` - Akses penuh ke semua fitur
- `products:create`, `products:edit`, `products:delete`, `products:view`
- `orders:view`, `orders:update`, `orders:delete`
- `tickets:view`, `tickets:respond`, `tickets:close`
- `analytics:view`
- `admins:view`, `admins:create`, `admins:edit`, `admins:delete`

## 📝 Mengelola Data Produk

### Lokasi File Produk
Data produk disimpan di: `src/data/products.json`

### Format Data Produk
```json
{
  "products": [
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
          "features": ["Setup 1 router", "Konfigurasi dasar"]
        }
      ],
      "related": ["vps", "code"]
    }
  ]
}
```

### Cara Edit Produk

#### Opsi 1: Via Admin Dashboard (Recommended)
1. Login ke Admin Dashboard
2. Klik menu "Produk"
3. Klik tombol "Edit" pada produk yang ingin diubah
4. Ubah data yang diperlukan
5. Klik "Simpan"
6. Export data ke JSON
7. Salin isi file ke `src/data/products.json`

#### Opsi 2: Edit File JSON Langsung
1. Buka file `src/data/products.json`
2. Edit data produk sesuai kebutuhan
3. Simpan file
4. Refresh website untuk melihat perubahan

### Kategori Produk
- `installation` - Layanan instalasi (WiFi, CCTV)
- `creative` - Layanan kreatif (Photo/Video Editing)
- `technical` - Layanan teknis (Code Repair, VPS)

## 🔒 Security Features

### 1. Rate Limiting
- Max 5 percobaan login gagal
- Lockout 15 menit setelah 5x gagal
- Session expiry 30 menit

### 2. Session Management
- Secure token generation
- Auto-logout on inactivity
- Session validation on each action

### 3. Activity Logging
Semua aktivitas admin dicatat:
- Login/Logout
- Create/Update/Delete produk
- Update status pesanan
- Perubahan pengaturan

### 4. Permission Checks
- Menu ditampilkan berdasarkan permissions
- Action buttons disabled jika tidak ada permission
- Permission denied page untuk unauthorized access

## 📊 Fitur Dashboard

### Dashboard Utama
- Real-time statistics
- Grafik pesanan 7 hari terakhir
- Grafik pendapatan
- Pesanan terbaru

### Kelola Produk
- Tambah/Edit/Hapus produk
- Search & filter
- Export ke JSON
- Preview perubahan

### Kelola Pesanan
- Lihat semua pesanan
- Update status pesanan
- Filter by status
- Detail pesanan dengan info WiFi installation

### Tiket Support
- Lihat tiket dari user
- Update status tiket
- Prioritaskan tiket

### Analitik
- Statistik penjualan
- Trend produk
- Laporan keuangan

## 🚀 Activity Log

Activity log dapat diakses di menu "Activity Log" (Super Admin only).

Setiap log mencakup:
- Timestamp
- Admin name & email
- Action type
- Target (product, order, etc.)
- IP Address
- User Agent

## 📱 Telegram Notifications

Admin dashboard mengirim notifikasi Telegram untuk:
- Login admin
- Order baru
- Payment berhasil
- Tiket support baru

Konfigurasi di `.env`:
```
VITE_TELEGRAM_BOT_TOKEN=your-bot-token
VITE_TELEGRAM_CHAT_ID=your-chat-id
```

## ⚙️ Environment Variables

Buat file `.env` di root project:

```env
# Admin Credentials (untuk reference, actual in src/data/admins.json)
VITE_ADMIN_EMAIL=admin@lumakara.com
VITE_ADMIN_PASSWORD=admin123

# reCAPTCHA v3
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# AI Chatbot (OpenAI)
VITE_AI_API_KEY=your-openai-api-key
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_MODEL=gpt-3.5-turbo

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=your-telegram-bot-token
VITE_TELEGRAM_CHAT_ID=your-telegram-chat-id

# Pakasir Payment
VITE_PAKASIR_API_KEY=your-pakasir-api-key
```

## 🛠️ Troubleshooting

### Tidak Bisa Login
1. Cek email dan password
2. Cek apakah akun terkunci (5x gagal login)
3. Clear browser cache dan cookies
4. Cek console untuk error messages

### Data Produk Tidak Update
1. Pastikan file `products.json` format valid
2. Cek browser console untuk error JSON parsing
3. Refresh halaman (F5)
4. Clear browser cache

### Session Expired Terus
1. Cek waktu sistem komputer
2. Pastikan tidak ada blocker cookie
3. Cek browser privacy settings

## 📝 Best Practices

1. **Jangan share credentials admin** dengan orang lain
2. **Logout** setelah selesai menggunakan dashboard
3. **Gunakan role yang sesuai** untuk setiap admin
4. **Review activity log** secara berkala
5. **Backup data produk** secara rutin
6. **Update password** secara berkala

## 🔧 Customization

### Menambah Admin Baru
Edit file `src/data/admins.json`:

```json
{
  "admins": [
    {
      "id": "unique-id",
      "email": "newadmin@example.com",
      "password": "securepassword",
      "name": "New Admin",
      "role": "admin",
      "permissions": ["products:*", "orders:*"]
    }
  ]
}
```

### Custom Permissions
Tambahkan permission baru di `src/lib/admin-auth.ts`:

```typescript
const ROLE_PERMISSIONS = {
  custom_role: [
    'products:view',
    'orders:view',
    'custom:permission'
  ]
};
```

## 📞 Support

Jika mengalami masalah dengan admin dashboard:
1. Cek browser console untuk error
2. Review activity logs
3. Hubungi Super Admin
4. Buat tiket support melalui website

---

**Last Updated**: 2024
**Version**: 2.0
