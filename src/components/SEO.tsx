import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}

const DEFAULT_SEO = {
  title: 'Layanan Digital - Solusi Teknologi Profesional',
  description: 'Layanan digital profesional untuk instalasi WiFi, CCTV, editing kreatif, dan solusi teknologi lainnya. Pelayanan terbaik dengan harga terjangkau.',
  keywords: ['layanan digital', 'instalasi wifi', 'cctv', 'editing', 'teknologi', 'jasa digital'],
  image: '/og-image.jpg', // Open Graph image
  url: typeof window !== 'undefined' ? window.location.href : '',
  type: 'website' as const,
};

export function SEO({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  image = DEFAULT_SEO.image,
  url = DEFAULT_SEO.url,
  type = DEFAULT_SEO.type,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title === DEFAULT_SEO.title ? title : `${title} | Layanan Digital`;

    // Helper function to update or create meta tag
    const setMetaTag = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.name = name;
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic Meta Tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords.join(', '));
    
    // Robots
    if (noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Open Graph / Facebook
    setMetaTag('og:type', type, true);
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:site_name', 'Layanan Digital', true);
    setMetaTag('og:locale', 'id_ID', true);

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Additional SEO tags
    setMetaTag('author', 'Layanan Digital');
    setMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5');
    setMetaTag('theme-color', '#2563eb');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Cleanup function
    return () => {
      // Meta tags are not removed to prevent flickering
    };
  }, [title, description, keywords, image, url, type, noIndex]);

  return null;
}

// Predefined SEO configurations for common pages
export const SEOConfig = {
  home: {
    title: 'Layanan Digital - Solusi Teknologi Profesional',
    description: 'Layanan digital profesional untuk instalasi WiFi, CCTV, editing kreatif, dan solusi teknologi lainnya.',
  },
  cart: {
    title: 'Keranjang Belanja',
    description: 'Lihat dan kelola item di keranjang belanja Anda.',
  },
  checkout: {
    title: 'Checkout',
    description: 'Selesaikan pesanan Anda dengan mudah dan aman.',
  },
  profile: {
    title: 'Profil Saya',
    description: 'Kelola profil dan lihat riwayat pesanan Anda.',
  },
  support: {
    title: 'Bantuan & Support',
    description: 'Dapatkan bantuan dan dukungan dari tim kami.',
  },
  auth: {
    title: 'Masuk / Daftar',
    description: 'Masuk atau daftar akun untuk mengakses layanan kami.',
    noIndex: true,
  },
  admin: {
    title: 'Admin Dashboard',
    description: 'Panel administrasi untuk mengelola pesanan dan produk.',
    noIndex: true,
  },
};
