import { ProductService, type Product } from './db';

// ==================== KIMI AI CONFIGURATION ====================

// KIMI API key is now server-side only — routed through ai-proxy Edge Function
// VITE_KIMI_API_KEY removed from frontend bundle for security
const KIMI_API_URL = '/functions/v1/ai-proxy';
const KIMI_MODEL = 'moonshot-v1-8k'; // informational only
const KIMI_API_KEY = ''; // unused — key is server-side

const HAS_KIMI_API_KEY = true; // always true — key lives in Edge Function

// ==================== TYPES ====================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  text: string;
  products?: Product[];
  action?: 'show_products' | 'create_order' | 'support' | 'show_wifi_packages' | 'show_panel_info';
}

export interface Intent {
  type: 'product_inquiry' | 'support_request' | 'order_intent' | 'general' | 'wifi_inquiry' | 'panel_inquiry';
  confidence: number;
  entities?: {
    product_category?: string;
    product_name?: string;
    price_range?: { min?: number; max?: number };
    keywords?: string[];
  };
}

// ==================== SYSTEM CONTEXT ====================

const WEBSITE_CONTEXT = `Anda adalah asisten AI Layanan Digital, platform jasa digital profesional di Indonesia yang ULTRA CERDAS dan RESPONSIF.

TENTANG LAYANAN DIGITAL:
- Platform jasa digital terpercaya dengan 9 layanan profesional
- Tim teknisi dan profesional kreatif berpengalaman
- Fokus pada kualitas, keandalan, dan kepuasan pelanggan
- Support 24/7 untuk semua layanan

DAFTAR LENGKAP 9 PRODUK & LAYANAN:

1. Wi-Fi Installation Service (Kategori: installation)
   - Pemasangan dan konfigurasi jaringan WiFi profesional
   - Setup router, optimasi jangkauan, pengaturan keamanan
   - Paket: Basic, Standard, Premium
   - Harga: Rp 79.000 - Rp 249.000 (sekali bayar)
   - Pilih paket WiFi di checkout dengan form lengkap

2. CCTV Security System (Kategori: installation)
   - Instalasi kamera keamanan lengkap dengan monitoring
   - Setup remote viewing via aplikasi mobile
   - Paket: 2 kamera HD, 4 kamera 4K, 8 kamera 4K
   - Harga: Rp 179.000 - Rp 699.000

3. Code Error Repair (Kategori: technical)
   - Debugging dan perbaikan kode aplikasi/website
   - Code review dan optimasi performa
   - Support berbagai bahasa pemrograman
   - Harga: Rp 49.000 - Rp 249.000

4. Photo Editing (Kategori: creative)
   - Retouching foto profesional dan enhancement
   - Color correction dan background removal
   - Harga: Rp 25.000 - Rp 149.000

5. Video Editing (Kategori: creative)
   - Editing video untuk YouTube, medsos, presentasi
   - Color grading dan efek visual
   - Harga: Rp 69.000 - Rp 399.000

6. VPS Hosting (Kategori: technical)
   - Setup dan konfigurasi Virtual Private Server
   - Security hardening dan monitoring
   - Harga: Rp 39.000 - Rp 199.000/bulan

7. Panel Pterodactyl (Kategori: technical) ⭐ POPULER
   - Panel manajemen game server profesional
   - Support Minecraft, CS:GO, Valorant, GTA V, ARK, Rust
   - Domain: panel.lumakara.my.id
   - Buat username & password di checkout
   - Paket: Starter (Rp 129.000), Pro (Rp 249.000), Enterprise (Rp 499.000)
   - Fitur: Unlimited databases, SFTP Access, Backup system

8. Website Development (Kategori: technical)
   - Pembuatan website profesional modern & responsive
   - Landing Page, Company Profile, E-Commerce
   - Harga: Rp 799.000 - Rp 2.999.000
   - Gratis hosting 1 tahun

9. Graphic Design (Kategori: creative)
   - Desain logo, banner, social media, branding
   - Complete brand identity
   - Harga: Rp 99.000 - Rp 599.000

PAKET WIFI ION NETWORK (Langganan Bulanan):
- FLASH: 60 Mbps, 6 perangkat - Rp 235.997/bulan
- LIGHT: 100 Mbps, 8-10 perangkat - Rp 285.630/bulan
- AMAZING: 150 Mbps, 15 perangkat - Rp 358.651/bulan
- BLITZ: 300 Mbps, 20-25 perangkat - Rp 526.816/bulan
- UNIVERSE: 500 Mbps, unlimited - Rp 650.770/bulan
- INFINITE: 1 Gbps, unlimited - Rp 1.120.999/bulan

CARA PEMBAYARAN:
- QRIS (semua e-wallet)
- Virtual Account: BNI, BRI, Permata, CIMB, Maybank, BNC, ATM Bersama
- PayPal (untuk pembayaran internasional)
- Fee: 1% biaya layanan + 1.2% biaya admin

CARA MEMBANTU DENGAN CERDAS:
1. Selalu sapa user dengan ramah dan hangat
2. Berikan jawaban yang lengkap tapi ringkas
3. Jika user tanya harga, sebutkan range lengkap
4. Jika user bingung pilih produk, tanyakan kebutuhannya
5. Untuk WiFi dan Panel, arahkan ke checkout untuk isi form
6. Berikan rekomendasi sesuai budget dan kebutuhan
7. Jelaskan fitur unggulan setiap produk

GAYA KOMUNIKASI (ULTRA CERDAS):
- Ramah, profesional, dan helpful
- Bahasa Indonesia yang baik dan benar
- Gunakan emoji sesuai konteks
- Jawab dengan cepat dan tepat
- Selalu tawarkan bantuan tambahan
- Berikan informasi yang actionable

PENTING:
- Jika user ingin order WiFi atau Panel, arahkan ke checkout untuk isi form
- Jika user tanya panel, sebutkan domain: panel.lumakara.my.id
- Jika user tanya support game, sebutkan Minecraft, CS:GO, Valorant, GTA V, ARK, Rust`;

// ==================== CORE FUNCTIONS ====================

/**
 * Send a message to Kimi AI and get a response
 * Ultra responsive with streaming support
 */
export async function sendMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<AIResponse> {
  if (!HAS_KIMI_API_KEY) {
    console.log('Kimi API Key not configured, using fallback');
    return fallbackResponse(message);
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: WEBSITE_CONTEXT },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header — key is server-side in ai-proxy Edge Function
      },
      body: JSON.stringify({
        messages,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('Kimi AI API Error:', error);
      return fallbackResponse(message);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    // Parse intent and extract action
    const intent = await analyzeUserIntent(message);
    const action = determineAction(intent, aiText);

    // Get product recommendations if relevant
    let products: Product[] | undefined;
    if (action === 'show_products' || intent.type === 'product_inquiry') {
      products = await getProductRecommendations(message);
    }

    return {
      text: aiText,
      products: products?.length ? products : undefined,
      action,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Kimi AI request timeout');
      return {
        text: 'Maaf, respons sedikit lambat. Saya masih siap membantu! Ada yang bisa saya bantu?',
        action: 'support',
      };
    }
    console.error('Error calling Kimi AI API:', error);
    return fallbackResponse(message);
  }
}

/**
 * Stream response from Kimi AI for real-time updates
 */
export async function* streamMessage(
  message: string,
  history: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  if (!HAS_KIMI_API_KEY) {
    yield 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
    return;
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: WEBSITE_CONTEXT },
      ...history.slice(-5),
      { role: 'user', content: message },
    ];

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    yield 'Maaf, terjadi kesalahan. Silakan coba lagi.';
  }
}

/**
 * Get product recommendations based on user query
 * Enhanced with smart matching
 */
export async function getProductRecommendations(query: string): Promise<Product[]> {
  try {
    const allProducts = await ProductService.getAll();
    const query_lower = query.toLowerCase();

    // Score each product based on relevance
    const scoredProducts = allProducts.map((product) => {
      let score = 0;
      const text = `${product.title} ${product.description} ${product.tags?.join(' ') || ''}`.toLowerCase();

      // Exact matches get higher scores
      if (text.includes(query_lower)) score += 15;

      // Category matching
      if (query_lower.includes('wifi') && (product.id === 'wifi' || product.tags?.includes('network'))) {
        score += 25;
      }
      if ((query_lower.includes('cctv') || query_lower.includes('kamera') || query_lower.includes('keamanan')) && 
          (product.id === 'cctv' || product.tags?.includes('security'))) {
        score += 25;
      }
      if ((query_lower.includes('code') || query_lower.includes('program') || query_lower.includes('coding') || 
           query_lower.includes('website') || query_lower.includes('aplikasi')) && 
          (product.id === 'code' || product.id === 'website' || product.category === 'technical')) {
        score += 25;
      }
      if ((query_lower.includes('photo') || query_lower.includes('foto') || query_lower.includes('edit')) && 
          product.category === 'creative') {
        score += 25;
      }
      if ((query_lower.includes('video') || query_lower.includes('film')) && 
          (product.id === 'video' || product.tags?.includes('video'))) {
        score += 25;
      }
      if ((query_lower.includes('vps') || query_lower.includes('server') || query_lower.includes('hosting')) && 
          product.id === 'vps') {
        score += 25;
      }
      if ((query_lower.includes('panel') || query_lower.includes('pterodactyl') || query_lower.includes('game') ||
           query_lower.includes('minecraft') || query_lower.includes('csgo') || query_lower.includes('valorant')) && 
          product.id === 'panel') {
        score += 30; // Higher priority for panel
      }
      if ((query_lower.includes('design') || query_lower.includes('logo') || query_lower.includes('branding') ||
           query_lower.includes('desain')) && 
          (product.id === 'design' || product.tags?.includes('design'))) {
        score += 25;
      }

      // Price range matching
      const priceMatch = query_lower.match(/(?:under|below|less than|dibawah|kurang dari)\s*(?:rp\.?\s*)?(\d+)/i);
      if (priceMatch && product.base_price <= parseInt(priceMatch[1]) * (priceMatch[1].length > 6 ? 1 : 1000)) {
        score += 10;
      }

      // Budget keywords
      if (query_lower.includes('murah') || query_lower.includes('termurah') || query_lower.includes('budget')) {
        if (product.base_price < 100000) score += 15;
      }
      if (query_lower.includes('premium') || query_lower.includes('terbaik')) {
        if (product.rating >= 4.8) score += 15;
      }

      // Tag matching
      if (product.tags) {
        product.tags.forEach((tag) => {
          if (query_lower.includes(tag.toLowerCase())) score += 8;
        });
      }

      return { product, score };
    });

    // Sort by score and return top matches
    return scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.product);
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    return [];
  }
}

/**
 * Analyze user intent from message using Kimi AI
 * Enhanced for better accuracy
 */
export async function analyzeUserIntent(message: string): Promise<Intent> {
  if (!HAS_KIMI_API_KEY) {
    return fallbackIntentAnalysis(message);
  }

  try {
    const prompt = `Analisis pesan user dan klasifikasikan intent dengan PRESISI TINGGI. Balas dengan JSON saja.

Pesan user: "${message}"

Kategori intent:
- product_inquiry: Tanya tentang produk/layanan/harga
- wifi_inquiry: Tanya khusus tentang WiFi/installasi
- panel_inquiry: Tanya khusus tentang Panel Pterodactyl/game server
- order_intent: Mau pesan/beli/checkout
- support_request: Butuh bantuan/teknis
- general: Percakapan umum

Format JSON:
{
  "type": "product_inquiry|wifi_inquiry|panel_inquiry|order_intent|support_request|general",
  "confidence": 0.0-1.0,
  "entities": {
    "product_category": "installation|creative|technical atau null",
    "product_name": "nama produk spesifik atau null",
    "keywords": ["keyword1", "keyword2"]
  }
}`;

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return fallbackIntentAnalysis(message);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || 'general',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities,
      };
    }

    return fallbackIntentAnalysis(message);
  } catch (error) {
    console.error('Error analyzing intent:', error);
    return fallbackIntentAnalysis(message);
  }
}

// ==================== HELPER FUNCTIONS ====================

function determineAction(intent: Intent, aiText: string): AIResponse['action'] {
  const text_lower = aiText.toLowerCase();
  
  if (intent.type === 'wifi_inquiry' || 
      text_lower.includes('paket wifi') || 
      text_lower.includes('wifi package')) {
    return 'show_wifi_packages';
  }
  
  if (intent.type === 'panel_inquiry' || 
      text_lower.includes('panel pterodactyl') || 
      text_lower.includes('game server')) {
    return 'show_panel_info';
  }
  
  if (intent.type === 'order_intent' || 
      text_lower.includes('order') || 
      text_lower.includes('pesan') ||
      text_lower.includes('checkout') ||
      text_lower.includes('beli') ||
      text_lower.includes('booking')) {
    return 'create_order';
  }
  
  if (intent.type === 'support_request' || 
      text_lower.includes('bantuan') || 
      text_lower.includes('help') ||
      text_lower.includes('support') ||
      text_lower.includes('masalah') ||
      text_lower.includes('error')) {
    return 'support';
  }
  
  if ((intent.type === 'product_inquiry' || 
       text_lower.includes('produk') || 
       text_lower.includes('layanan') ||
       text_lower.includes('harga') ||
       text_lower.includes('service')) &&
      !text_lower.includes('wifi') &&
      !text_lower.includes('panel')) {
    return 'show_products';
  }
  
  return undefined;
}

// ==================== FALLBACK FUNCTIONS ====================

function fallbackResponse(message: string): AIResponse {
  const query_lower = message.toLowerCase();
  
  // Extended keyword-based responses
  const responses: Record<string, string> = {
    // WiFi responses
    wifi: '🔥 **WiFi Installation Service**\n\nKami menyediakan pemasangan WiFi profesional dengan 3 paket:\n• **Basic**: Rp 79.000 (1 router, garansi 1 tahun)\n• **Standard**: Rp 149.000 (Mesh network, garansi 2 tahun)\n• **Premium**: Rp 249.000 (Enterprise system, garansi 3 tahun)\n\n💡 Pilih paket WiFi di halaman checkout dan lengkapi data pemasangan!',
    
    // Panel responses
    panel: '🎮 **Panel Pterodactyl**\n\nPanel manajemen game server profesional!\n\n🕹️ **Support Game:**\nMinecraft, CS:GO, Valorant, GTA V, ARK, Rust\n\n💰 **Paket:**\n• Starter: Rp 129.000 (1GB RAM, 3 servers)\n• Pro: Rp 249.000 (2GB RAM, 5 servers)\n• Enterprise: Rp 499.000 (4GB RAM, 10 servers)\n\n🌐 Domain: **panel.lumakara.my.id**\n\nBuat username & password Anda di checkout!',
    
    pterodactyl: '🎮 **Panel Pterodactyl**\n\nPanel manajemen game server profesional!\n\n🕹️ **Support Game:**\nMinecraft, CS:GO, Valorant, GTA V, ARK, Rust\n\n💰 **Paket:**\n• Starter: Rp 129.000 (1GB RAM, 3 servers)\n• Pro: Rp 249.000 (2GB RAM, 5 servers)\n• Enterprise: Rp 499.000 (4GB RAM, 10 servers)\n\n🌐 Domain: **panel.lumakara.my.id**\n\nBuat username & password Anda di checkout!',
    
    minecraft: '🎮 **Panel Pterodactyl - Minecraft Ready!**\n\nBuat server Minecraft Anda sendiri!\n\n✅ Support Minecraft Java & Bedrock\n✅ Unlimited players\n✅ Plugin & Mod support\n✅ Auto backup\n\n💰 Mulai dari Rp 129.000/bulan\n🌐 panel.lumakara.my.id\n\nPesan sekarang dan buat akun di checkout!',
    
    // CCTV responses
    cctv: '📹 **CCTV Security System**\n\nInstalasi kamera keamanan profesional:\n• **Basic**: 2 kamera HD - Rp 179.000\n• **Standard**: 4 kamera 4K - Rp 399.000\n• **Premium**: 8 kamera 4K - Rp 699.000\n\n✅ Akses mobile app\n✅ Night vision\n✅ Motion detection\n✅ Cloud backup',
    
    kamera: '📹 **CCTV Security System**\n\nInstalasi kamera keamanan profesional:\n• **Basic**: 2 kamera HD - Rp 179.000\n• **Standard**: 4 kamera 4K - Rp 399.000\n• **Premium**: 8 kamera 4K - Rp 699.000\n\n✅ Akses mobile app\n✅ Night vision\n✅ Motion detection',
    
    // Code responses
    code: '💻 **Code Error Repair**\n\nDebugging dan optimasi kode:\n• **Basic**: Rp 49.000 (Identifikasi bug, fix sederhana)\n• **Standard**: Rp 129.000 (Complex debugging, security audit)\n• **Premium**: Rp 249.000 (Full refactoring, long-term support)\n\n✅ Semua bahasa pemrograman\n✅ Performance optimization\n✅ Code review',
    
    program: '💻 **Code Error Repair & Development**\n\nLayanan coding profesional:\n• Debugging & bug fixing\n• Website development\n• App development\n• Code review & optimization\n\n💰 Mulai dari Rp 49.000',
    
    website: '🌐 **Website Development**\n\nPembuatan website profesional:\n• **Landing Page**: Rp 799.000\n• **Company Profile**: Rp 1.499.000\n• **E-Commerce**: Rp 2.999.000\n\n✅ Design modern & responsive\n✅ SEO optimized\n✅ Gratis hosting 1 tahun\n✅ CMS integration',
    
    // Photo/Video responses
    photo: '📸 **Photo Editing**\n\nEdit foto profesional:\n• **Basic**: Rp 25.000\n• **Standard**: Rp 79.000\n• **Premium**: Rp 149.000\n\n✅ Color correction\n✅ Background removal\n✅ Skin smoothing\n✅ RAW processing',
    
    video: '🎬 **Video Editing**\n\nEditing video profesional:\n• **Basic**: Rp 69.000 (Basic cuts, 1080p)\n• **Standard**: Rp 199.000 (Color grading, 4K)\n• **Premium**: Rp 399.000 (VFX, Cinema quality)\n\n✅ YouTube, TikTok, Reels\n✅ Color grading\n✅ Motion graphics',
    
    // VPS responses
    vps: '☁️ **VPS Hosting**\n\nVirtual Private Server:\n• **Basic**: Rp 39.000/bulan (2 CPU, 4GB RAM)\n• **Standard**: Rp 99.000/bulan (4 CPU, 8GB RAM)\n• **Premium**: Rp 199.000/bulan (8 CPU, 16GB RAM)\n\n✅ SSD Storage\n✅ Unlimited bandwidth\n✅ 24/7 monitoring',
    
    server: '☁️ **VPS Hosting & Panel**\n\nKami punya 2 solusi server:\n\n1️⃣ **VPS Hosting** - Mulai Rp 39.000/bulan\n   Untuk website & aplikasi\n\n2️⃣ **Panel Pterodactyl** - Mulai Rp 129.000/bulan\n   Untuk game server (Minecraft, CS:GO, dll)\n\nMau yang mana?',
    
    // Design responses
    design: '🎨 **Graphic Design**\n\nJasa desain profesional:\n• **Basic**: Rp 99.000 (Logo, 3 revisi)\n• **Business**: Rp 249.000 (Logo vector, social media kit)\n• **Complete Branding**: Rp 599.000 (Full brand identity)\n\n✅ Logo, banner, social media\n✅ Brand guidelines\n✅ Hak cipta penuh',
    
    logo: '🎨 **Logo Design**\n\nDesain logo profesional:\n• **Basic**: Rp 99.000 (1 konsep, PNG/JPG)\n• **Business**: Rp 249.000 (3 konsep, vector files)\n• **Complete**: Rp 599.000 (Brand identity lengkap)\n\n✅ Unlimited revisi (sesuai paket)\n✅ File vector (AI, EPS, SVG)\n✅ Hak cipta penuh',
    
    // Harga responses
    harga: '💰 **Daftar Harga Layanan Digital**\n\n📶 WiFi: Rp 79.000 - Rp 249.000\n📹 CCTV: Rp 179.000 - Rp 699.000\n💻 Code: Rp 49.000 - Rp 249.000\n📸 Photo: Rp 25.000 - Rp 149.000\n🎬 Video: Rp 69.000 - Rp 399.000\n☁️ VPS: Rp 39.000 - Rp 199.000/bulan\n🎮 Panel: Rp 129.000 - Rp 499.000/bulan\n🌐 Website: Rp 799.000 - Rp 2.999.000\n🎨 Design: Rp 99.000 - Rp 599.000\n\nMau info lengkap produk mana?',
    
    price: '💰 **Daftar Harga Layanan Digital**\n\n📶 WiFi: Rp 79.000 - Rp 249.000\n📹 CCTV: Rp 179.000 - Rp 699.000\n💻 Code: Rp 49.000 - Rp 249.000\n📸 Photo: Rp 25.000 - Rp 149.000\n🎬 Video: Rp 69.000 - Rp 399.000\n☁️ VPS: Rp 39.000 - Rp 199.000/bulan\n🎮 Panel: Rp 129.000 - Rp 499.000/bulan\n🌐 Website: Rp 799.000 - Rp 2.999.000\n🎨 Design: Rp 99.000 - Rp 599.000',
    
    murah: '💎 **Layanan Termurah Kami:**\n\n1. Photo Editing Basic - Rp 25.000\n2. Code Repair Basic - Rp 49.000\n3. VPS Hosting - Rp 39.000/bulan\n4. WiFi Basic - Rp 79.000\n5. Design Basic - Rp 99.000\n\nMau lihat detail produk mana?',
    
    // Bayar responses
    bayar: '💳 **Metode Pembayaran:**\n\n✅ QRIS (Gojek, OVO, DANA, LinkAja, dll)\n✅ Virtual Account (BNI, BRI, Permata, CIMB, Maybank, BNC)\n✅ ATM Bersama\n✅ PayPal (internasional)\n\n💡 Fee: 1% biaya layanan + 1.2% biaya admin\n\nSemua pembayaran aman & terenkripsi!',
    
    payment: '💳 **Metode Pembayaran:**\n\n✅ QRIS (semua e-wallet)\n✅ Virtual Account (BNI, BRI, Permata, CIMB, Maybank, BNC)\n✅ ATM Bersama\n✅ PayPal\n\nFee: 1% + 1.2%',
    
    // Bantuan responses
    bantuan: '👋 **Halo! Saya asisten AI Layanan Digital**\n\nSaya bisa bantu Anda dengan:\n🔍 Info 9 produk/layanan kami\n💰 Cek harga & paket\n🛒 Panduan pemesanan\n🎮 Info Panel Pterodactyl\n📶 Info WiFi Installation\n\n**Mau tanya apa?**',
    
    help: '👋 **Halo! Saya asisten AI Layanan Digital**\n\nSaya bisa bantu Anda dengan:\n🔍 Info 9 produk/layanan kami\n💰 Cek harga & paket\n🛒 Panduan pemesanan\n🎮 Info Panel Pterodactyl\n📶 Info WiFi Installation\n\n**Mau tanya apa?**',
    
    // Default greetings
    hello: '👋 **Halo! Selamat datang di Layanan Digital!**\n\nKami punya **9 layanan profesional** untuk kebutuhan digital Anda:\n\n📶 WiFi | 📹 CCTV | 💻 Code | 📸 Photo\n🎬 Video | ☁️ VPS | 🎮 Panel | 🌐 Website | 🎨 Design\n\nMau tau info lengkap tentang produk mana?',
    
    hai: '👋 **Halo! Selamat datang di Layanan Digital!**\n\nKami punya **9 layanan profesional** untuk kebutuhan digital Anda:\n\n📶 WiFi | 📹 CCTV | 💻 Code | 📸 Photo\n🎬 Video | ☁️ VPS | 🎮 Panel | 🌐 Website | 🎨 Design\n\nMau tau info lengkap tentang produk mana?',
    
    hi: '👋 **Hello! Welcome to Layanan Digital!**\n\nWe have **9 professional services** for your digital needs.\n\nType "help" to see what I can assist you with!',
    
    // Produk/semua responses
    produk: '📋 **Semua Produk Layanan Digital (9 Layanan):**\n\n1️⃣ **WiFi Installation** - Rp 79rb-249rb\n2️⃣ **CCTV Security** - Rp 179rb-699rb\n3️⃣ **Code Repair** - Rp 49rb-249rb\n4️⃣ **Photo Editing** - Rp 25rb-149rb\n5️⃣ **Video Editing** - Rp 69rb-399rb\n6️⃣ **VPS Hosting** - Rp 39rb-199rb/bulan\n7️⃣ **🎮 Panel Pterodactyl** - Rp 129rb-499rb/bulan\n8️⃣ **Website Dev** - Rp 799rb-2.999jt\n9️⃣ **Graphic Design** - Rp 99rb-599rb\n\nKetik nama produk untuk detail lengkap!',
    
    semua: '📋 **Semua Produk Layanan Digital (9 Layanan):**\n\n1️⃣ **WiFi Installation** - Rp 79rb-249rb\n2️⃣ **CCTV Security** - Rp 179rb-699rb\n3️⃣ **Code Repair** - Rp 49rb-249rb\n4️⃣ **Photo Editing** - Rp 25rb-149rb\n5️⃣ **Video Editing** - Rp 69rb-399rb\n6️⃣ **VPS Hosting** - Rp 39rb-199rb/bulan\n7️⃣ **🎮 Panel Pterodactyl** - Rp 129rb-499rb/bulan\n8️⃣ **Website Dev** - Rp 799rb-2.999jt\n9️⃣ **Graphic Design** - Rp 99rb-599rb\n\nKetik nama produk untuk detail lengkap!',
  };

  // Find matching keyword
  for (const [keyword, response] of Object.entries(responses)) {
    if (query_lower.includes(keyword)) {
      let action: AIResponse['action'] = undefined;
      
      if (['wifi', 'paket wifi'].includes(keyword)) {
        action = 'show_wifi_packages';
      } else if (['panel', 'pterodactyl', 'minecraft', 'game server'].includes(keyword)) {
        action = 'show_panel_info';
      } else if (['produk', 'semua', 'wifi', 'cctv', 'code', 'program', 'photo', 'video', 'vps', 'server', 'harga', 'price', 'design', 'website'].includes(keyword)) {
        action = 'show_products';
      }
      
      return { text: response, action };
    }
  }

  // Default response
  return {
    text: '👋 **Halo! Saya asisten AI Layanan Digital**\n\nSaya siap membantu Anda dengan:\n• Info 9 produk/layanan kami\n• Rekomendasi sesuai kebutuhan\n• Panduan pemesanan\n• Info harga & paket\n\n**Coba tanyakan:**\n💬 "Info WiFi"\n💬 "Harga Panel"\n💬 "Layanan apa saja?"\n💬 "Mau pesan CCTV"\n\nAda yang bisa saya bantu? 😊',
  };
}

function fallbackIntentAnalysis(message: string): Intent {
  const query_lower = message.toLowerCase();
  
  // Check for WiFi intent
  if (/\b(wifi|internet|jaringan|router|hotspot|broadband)\b/.test(query_lower)) {
    return {
      type: 'wifi_inquiry',
      confidence: 0.9,
      entities: { keywords: ['wifi'], product_category: 'installation' },
    };
  }
  
  // Check for Panel intent
  if (/\b(panel|pterodactyl|minecraft|game server|csgo|valorant|gta|ark|rust|server game)\b/.test(query_lower)) {
    return {
      type: 'panel_inquiry',
      confidence: 0.9,
      entities: { keywords: ['panel', 'game'], product_category: 'technical' },
    };
  }
  
  // Check for order intent
  if (/\b(pesan|order|beli|checkout|booking|mau|ingin)\b/.test(query_lower)) {
    return {
      type: 'order_intent',
      confidence: 0.8,
      entities: { keywords: ['order'] },
    };
  }
  
  // Check for support intent
  if (/\b(bantuan|help|support|masalah|error|gagal|tidak bisa)\b/.test(query_lower)) {
    return {
      type: 'support_request',
      confidence: 0.8,
      entities: { keywords: ['support'] },
    };
  }
  
  // Check for product inquiry
  if (/\b(wifi|cctv|code|program|photo|video|vps|server|harga|price|layanan|produk|service|design|website|panel)\b/.test(query_lower)) {
    let category: string | undefined;
    if (/wifi|cctv/.test(query_lower)) category = 'installation';
    else if (/code|program|vps|server|panel|website/.test(query_lower)) category = 'technical';
    else if (/photo|video|design/.test(query_lower)) category = 'creative';
    
    return {
      type: 'product_inquiry',
      confidence: 0.7,
      entities: { product_category: category, keywords: ['product'] },
    };
  }
  
  return {
    type: 'general',
    confidence: 0.5,
  };
}

// ==================== EXPORT CONFIG ====================

export const AIChatbotConfig = {
  hasApiKey: HAS_KIMI_API_KEY,
  model: KIMI_MODEL,
  apiUrl: KIMI_API_URL,
};

// Export default
export default {
  sendMessage,
  streamMessage,
  getProductRecommendations,
  analyzeUserIntent,
  AIChatbotConfig,
};
