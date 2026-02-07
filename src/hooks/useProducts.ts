import { useEffect, useState, useCallback } from 'react';
import { ProductService, type Product } from '@/lib/firebase-db';
import { useAppStore } from '@/store/appStore';
import { showErrorBox } from '@/lib/error-tracker';

export const useProducts = () => {
  const { products, setProducts } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ProductService.getAll();
      setProducts(data);
    } catch (err: any) {
      showErrorBox('💥 FETCH PRODUCTS ERROR', {
        'Error': err?.message || 'Failed to fetch products',
      }, 'error');
      setError(err.message || 'Failed to fetch products');
      // Fallback to mock data if Firestore is not configured
      loadMockProducts();
    } finally {
      setIsLoading(false);
    }
  }, [setProducts]);

  const loadMockProducts = () => {
    const mockProducts: Product[] = [
      {
        id: 'wifi',
        title: 'Wi-Fi Installation Service',
        category: 'installation',
        base_price: 89000,
        discount_price: 79000,
        stock: 100,
        image: 'https://readdy.ai/api/search-image?query=Professional%20Wi-Fi%20installation%20service%20setup&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20wifi%20router&width=150&height=150',
        rating: 4.8,
        reviews: 156,
        duration: '2-3 jam',
        description: 'Pemasangan dan konfigurasi jaringan wireless profesional untuk rumah dan kantor.',
        tags: ['network', 'internet', 'setup'],
        tiers: [
          { name: 'Basic', price: 89000, features: ['Setup 1 router', 'Konfigurasi dasar', 'Optimasi kecepatan', 'Garansi 1 tahun'] },
          { name: 'Standard', price: 149000, features: ['Setup mesh network', 'Keamanan advanced', 'Optimasi multi device', 'Guest network', 'Garansi 2 tahun'] },
          { name: 'Premium', price: 249000, features: ['Enterprise mesh system', 'Security suite', 'IoT management', 'Priority support', 'Garansi 3 tahun'] }
        ],
        related: ['vps', 'code', 'panel']
      },
      {
        id: 'cctv',
        title: 'CCTV Security System',
        category: 'installation',
        base_price: 199000,
        discount_price: 179000,
        stock: 50,
        image: 'https://readdy.ai/api/search-image?query=Professional%20CCTV%20security%20camera%20installation&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20security%20camera&width=150&height=150',
        rating: 4.7,
        reviews: 89,
        duration: '4-6 jam',
        description: 'Instalasi kamera keamanan lengkap dengan monitoring dan akses mobile.',
        tags: ['security', 'camera', 'monitoring'],
        tiers: [
          { name: 'Basic', price: 199000, features: ['2 kamera HD', 'Recording dasar', 'Akses mobile app', 'Storage 1 TB'] },
          { name: 'Standard', price: 399000, features: ['4 kamera 4K', 'Night vision', 'Motion detection', 'Cloud backup', 'Storage 2 TB'] },
          { name: 'Premium', price: 699000, features: ['8 kamera 4K', 'AI detection', '24/7 monitoring', 'Professional monitoring', 'Storage 4 TB'] }
        ],
        related: ['wifi', 'vps', 'panel']
      },
      {
        id: 'code',
        title: 'Code Error Repair',
        category: 'technical',
        base_price: 59000,
        discount_price: 49000,
        stock: 200,
        image: 'https://readdy.ai/api/search-image?query=software%20developer%20debugging%20code&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20code%20debugging&width=150&height=150',
        rating: 4.9,
        reviews: 234,
        duration: '1-4 jam',
        description: 'Debugging dan optimasi kode expert untuk website dan aplikasi.',
        tags: ['debugging', 'coding', 'development'],
        tiers: [
          { name: 'Basic', price: 59000, features: ['Identifikasi bug', 'Fix sederhana', 'Code review', 'Dokumentasi'] },
          { name: 'Standard', price: 129000, features: ['Complex debugging', 'Performance optimization', 'Security audit', 'Testing'] },
          { name: 'Premium', price: 249000, features: ['Full code refactoring', 'Architecture review', 'Performance tuning', 'Long-term support'] }
        ],
        related: ['vps', 'wifi', 'website']
      },
      {
        id: 'photo',
        title: 'Photo Editing',
        category: 'creative',
        base_price: 29000,
        discount_price: 25000,
        stock: 150,
        image: 'https://readdy.ai/api/search-image?query=photo%20editing%20workspace&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20camera%20editing&width=150&height=150',
        rating: 4.6,
        reviews: 120,
        duration: '1-2 hari',
        description: 'Retouching dan enhancement gambar profesional.',
        tags: ['photo', 'editing', 'creative'],
        tiers: [
          { name: 'Basic', price: 29000, features: ['Color correction', 'Basic retouching', 'Format conversion', '5 revisi'] },
          { name: 'Standard', price: 79000, features: ['Advanced retouching', 'Background removal', 'Skin smoothing', 'Unlimited revisi'] },
          { name: 'Premium', price: 149000, features: ['High-end editing', 'Composite work', 'RAW processing', 'Priority delivery'] }
        ],
        related: ['video', 'code', 'design']
      },
      {
        id: 'video',
        title: 'Video Editing',
        category: 'creative',
        base_price: 79000,
        discount_price: 69000,
        stock: 80,
        image: 'https://readdy.ai/api/search-image?query=video%20editing%20studio&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20video%20camera&width=150&height=150',
        rating: 4.8,
        reviews: 95,
        duration: '2-5 hari',
        description: 'Editing video dan post-production profesional.',
        tags: ['video', 'editing', 'production'],
        tiers: [
          { name: 'Basic', price: 79000, features: ['Basic cuts', 'Transitions', 'Audio sync', 'Output 1080p'] },
          { name: 'Standard', price: 199000, features: ['Color grading', 'Motion graphics', 'Sound mixing', 'Output 4K'] },
          { name: 'Premium', price: 399000, features: ['VFX', 'Animation', 'Professional sound design', 'Cinema quality'] }
        ],
        related: ['photo', 'code', 'design']
      },
      {
        id: 'vps',
        title: 'VPS Hosting',
        category: 'technical',
        base_price: 49000,
        discount_price: 39000,
        stock: 500,
        image: 'https://readdy.ai/api/search-image?query=data%20center%20server%20racks&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20server%20rack&width=150&height=150',
        rating: 4.5,
        reviews: 180,
        duration: 'Instant',
        description: 'Solusi hosting Virtual Private Server.',
        tags: ['hosting', 'server', 'infrastructure'],
        tiers: [
          { name: 'Basic', price: 49000, features: ['2 CPU cores', '4GB RAM', '50GB SSD', '1TB bandwidth'] },
          { name: 'Standard', price: 99000, features: ['4 CPU cores', '8GB RAM', '100GB SSD', '2TB bandwidth'] },
          { name: 'Premium', price: 199000, features: ['8 CPU cores', '16GB RAM', '200GB SSD', 'Unlimited bandwidth'] }
        ],
        related: ['wifi', 'code', 'panel']
      },
      // 3 PRODUK BARU
      {
        id: 'panel',
        title: 'Panel Pterodactyl',
        category: 'technical',
        base_price: 150000,
        discount_price: 129000,
        stock: 100,
        image: 'https://readdy.ai/api/search-image?query=game%20server%20control%20panel%20dashboard&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20game%20server%20control%20panel&width=150&height=150',
        rating: 4.9,
        reviews: 145,
        duration: '1-2 jam',
        description: 'Panel manajemen game server Pterodactyl profesional dengan domain custom. Support Minecraft, CS:GO, Valheim, dan banyak game lainnya.',
        tags: ['game', 'server', 'panel', 'hosting', 'pterodactyl'],
        tiers: [
          { name: 'Starter', price: 129000, features: ['1GB RAM per server', '3 servers', 'Unlimited databases', 'SFTP Access', 'Domain panel: panel.lumakara.my.id'] },
          { name: 'Pro', price: 249000, features: ['2GB RAM per server', '5 servers', 'Unlimited databases', 'SFTP Access', 'Backup system', 'Domain panel: panel.lumakara.my.id'] },
          { name: 'Enterprise', price: 499000, features: ['4GB RAM per server', '10 servers', 'Unlimited databases', 'SFTP Access', 'Backup system', 'Priority support', 'Domain panel: panel.lumakara.my.id'] }
        ],
        related: ['vps', 'code', 'wifi']
      },
      {
        id: 'website',
        title: 'Website Development',
        category: 'technical',
        base_price: 999000,
        discount_price: 799000,
        stock: 30,
        image: 'https://readdy.ai/api/search-image?query=website%20development%20coding%20modern%20design&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20website%20development&width=150&height=150',
        rating: 4.8,
        reviews: 78,
        duration: '7-14 hari',
        description: 'Pembuatan website profesional dengan desain modern dan responsive. Cocok untuk company profile, e-commerce, dan aplikasi web.',
        tags: ['website', 'development', 'coding', 'design'],
        tiers: [
          { name: 'Landing Page', price: 799000, features: ['1 halaman', 'Design responsive', 'SEO basic', '3 revisi', 'Gratis hosting 1 tahun'] },
          { name: 'Company Profile', price: 1499000, features: ['5-7 halaman', 'Design custom', 'SEO optimized', 'CMS integration', '5 revisi', 'Gratis hosting 1 tahun'] },
          { name: 'E-Commerce', price: 2999000, features: ['Unlimited halaman', 'Design premium', 'Payment gateway', 'Admin dashboard', 'Unlimited revisi', 'Gratis hosting 1 tahun', 'Support 3 bulan'] }
        ],
        related: ['code', 'photo', 'video']
      },
      {
        id: 'design',
        title: 'Graphic Design',
        category: 'creative',
        base_price: 149000,
        discount_price: 99000,
        stock: 200,
        image: 'https://readdy.ai/api/search-image?query=graphic%20design%20studio%20creative%20workspace&width=300&height=200',
        icon: 'https://readdy.ai/api/search-image?query=icon%203D%20graphic%20design%20palette&width=150&height=150',
        rating: 4.7,
        reviews: 112,
        duration: '2-5 hari',
        description: 'Jasa desain grafis profesional untuk logo, banner, social media, dan kebutuhan branding bisnis Anda.',
        tags: ['design', 'creative', 'branding', 'logo'],
        tiers: [
          { name: 'Basic', price: 99000, features: ['1 konsep logo', 'File PNG & JPG', '3 revisi', 'Hak cipta penuh'] },
          { name: 'Business', price: 249000, features: ['3 konsep logo', 'File vector (AI, EPS, SVG)', 'Social media kit', '5 revisi', 'Hak cipta penuh'] },
          { name: 'Complete Branding', price: 599000, features: ['5 konsep logo', 'Complete brand identity', 'Stationery design', 'Social media kit', 'Brand guidelines', 'Unlimited revisi', 'Hak cipta penuh'] }
        ],
        related: ['photo', 'video', 'website']
      },
    ];
    setProducts(mockProducts);
  };

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  const getProductById = useCallback((id: string) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const getProductsByCategory = useCallback((category: string) => {
    if (category === 'all') return products;
    return products.filter((p) => p.category === category);
  }, [products]);

  const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await ProductService.create(product);
      setProducts([newProduct, ...products]);
      return newProduct;
    } catch (err: any) {
      throw err;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updated = await ProductService.update(id, updates);
      setProducts(products.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await ProductService.delete(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const updateStock = async (id: string, stock: number) => {
    try {
      await ProductService.updateStock(id, stock);
      setProducts(products.map((p) => (p.id === id ? { ...p, stock } : p)));
    } catch (err: any) {
      throw err;
    }
  };

  const updatePrice = async (id: string, basePrice: number, discountPrice?: number) => {
    try {
      await ProductService.updatePrice(id, basePrice, discountPrice);
      setProducts(products.map((p) => 
        p.id === id ? { ...p, base_price: basePrice, discount_price: discountPrice } : p
      ));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    getProductById,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    updatePrice,
  };
};
