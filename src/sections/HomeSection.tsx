import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Star, ChevronLeft, ChevronRight, 
  Sparkles, Zap, Headphones, Palette, Code, Wrench, Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useProducts } from '@/hooks/useProducts';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import type { Product } from '@/lib/firebase-db';

// =============================================================================
// CONSTANTS
// =============================================================================

const categories = [
  { id: 'all', label: 'Semua', icon: Sparkles },
  { id: 'installation', label: 'Instalasi', icon: Wrench },
  { id: 'creative', label: 'Kreatif', icon: Palette },
  { id: 'technical', label: 'Teknis', icon: Code },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getProductLabel(product: Product, avgPrice: number): { type: string; label: string; color: string } | null {
  if (product.rating >= 4.8 && product.reviews > 100) {
    return { type: 'bestseller', label: '⭐ Best Seller', color: 'bg-yellow-500 text-white' };
  }
  if (product.base_price < avgPrice * 0.7) {
    return { type: 'cheap', label: '💰 Termurah', color: 'bg-green-500 text-white' };
  }
  if (product.reviews > 150) {
    return { type: 'trending', label: '🔥 Trending', color: 'bg-orange-500 text-white' };
  }
  if (product.created_at && new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
    return { type: 'new', label: '✨ Baru', color: 'bg-blue-500 text-white' };
  }
  return null;
}

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

// =============================================================================
// PRODUCT CARD COMPONENT - Ultra Optimized
// =============================================================================

interface ProductCardProps {
  product: Product;
  avgPrice: number;
  isDarkMode: boolean;
}

const ProductCard = memo(function ProductCard({ 
  product, 
  avgPrice,
  isDarkMode 
}: ProductCardProps) {
  const navigate = useNavigate();
  const { cart } = useAppStore();
  
  const price = product.discount_price || product.base_price;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.discount_price || 0)) / product.base_price) * 100)
    : 0;
  
  const label = useMemo(() => getProductLabel(product, avgPrice), [product, avgPrice]);
  
  // Check if in cart
  const cartItem = useMemo(() => {
    return cart.find(item => item.productId === product.id);
  }, [cart, product.id]);

  const handleClick = useCallback(() => {
    audioService.playClick();
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  return (
    <div
      onClick={handleClick}
      className={`
        rounded-xl shadow-sm overflow-hidden cursor-pointer
        transform transition-transform duration-150 active:scale-95
        hover:shadow-md
        ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
      `}
      style={{ willChange: 'transform', contentVisibility: 'auto' }}
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        <img
          src={product.icon}
          alt={product.title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        
        {/* Product Label */}
        {label && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold ${label.color} shadow-sm`}>
            {label.label}
          </div>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white shadow-sm">
            -{discountPercent}%
          </div>
        )}
        
        {/* Cart Badge */}
        {cartItem && (
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
            {cartItem.quantity}
          </div>
        )}
        
        {/* Stock Warning */}
        {product.stock < 20 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white shadow-sm">
            Stok Terbatas
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-2.5">
        <h3 className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {product.title}
        </h3>
        <p className={`text-xs line-clamp-1 mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-blue-600 font-bold text-sm">
              {formatPrice(price)}
            </span>
            {hasDiscount && (
              <span className={`text-[10px] line-through ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatPrice(product.base_price)}
              </span>
            )}
          </div>
          <div className="flex items-center text-yellow-500 text-xs">
            <Star className="h-3 w-3 fill-current" />
            <span className="ml-0.5">{product.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// HERO BANNER COMPONENT - Lazy Loaded
// =============================================================================

const HeroBanner = memo(function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = useMemo(() => [
    { title: 'Layanan Digital Profesional', subtitle: 'Solusi lengkap untuk kebutuhan teknologi Anda', gradient: 'from-blue-600 via-blue-500 to-cyan-400', icon: Zap },
    { title: 'Instalasi Wi-Fi & CCTV', subtitle: 'Jaringan aman dan terpercaya', gradient: 'from-orange-500 via-orange-400 to-yellow-400', icon: Shield },
    { title: 'Editing Kreatif', subtitle: 'Photo & video editing profesional', gradient: 'from-purple-600 via-purple-500 to-pink-400', icon: Palette },
    { title: 'Support Teknis 24/7', subtitle: 'Tim ahli siap membantu', gradient: 'from-green-600 via-green-500 to-emerald-400', icon: Headphones },
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative h-40 overflow-hidden bg-gray-900">
      {slides.map((slide, index) => {
        const Icon = slide.icon;
        const isActive = index === currentSlide;
        
        return (
          <div
            key={index}
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-r ${slide.gradient} px-6 transition-opacity duration-500 ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="text-center text-white max-w-md">
              <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">{slide.title}</h2>
              <p className="text-white/80 mt-1 text-xs">{slide.subtitle}</p>
            </div>
          </div>
        );
      })}

      {/* Navigation Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all ${
              currentSlide === index ? 'bg-white w-4' : 'bg-white/50 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// SKELETON LOADER - Shown immediately
// =============================================================================

function ProductSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`aspect-square ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
      <div className="p-2.5 space-y-2">
        <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-3/4`} />
        <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-full`} />
        <div className="flex justify-between">
          <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-1/3`} />
          <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-1/4`} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN HOME SECTION COMPONENT - Optimized for Speed
// =============================================================================

export default function HomeSection() {
  const { products, isLoading } = useProducts();
  const { isDarkMode } = useAppStore();
  
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [showHero, setShowHero] = useState(false);
  
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Delay hero banner loading to prioritize products
  useEffect(() => {
    const timer = setTimeout(() => setShowHero(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate avg price once
  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.base_price, 0) / products.length;
  }, [products]);

  // Apply search
  const applySearch = useCallback(() => {
    setAppliedSearchQuery(searchInput);
    audioService.playClick();
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applySearch();
  }, [applySearch]);

  const handleCategoryClick = useCallback((catId: string) => {
    audioService.playClick();
    setAppliedCategory(catId);
  }, []);

  // Product filtering - optimized dengan useMemo
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    let result = products;
    
    if (appliedCategory !== 'all') {
      result = result.filter(p => p.category === appliedCategory);
    }
    
    if (appliedSearchQuery.trim()) {
      const query = appliedSearchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [products, appliedCategory, appliedSearchQuery]);

  const clearFilters = useCallback(() => {
    audioService.playClick();
    setAppliedCategory('all');
    setSearchInput('');
    setAppliedSearchQuery('');
  }, []);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  }, []);

  const activeFiltersCount = useMemo(() => {
    return [appliedCategory !== 'all', appliedSearchQuery].filter(Boolean).length;
  }, [appliedCategory, appliedSearchQuery]);

  return (
    <div className={`pb-20 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Hero Banner - Loaded with delay */}
      {showHero && <HeroBanner />}

      {/* Search & Filter Bar */}
      <div className={`sticky top-[60px] z-30 px-4 py-3 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm shadow-sm`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari layanan..."
              className={`pl-9 pr-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchInput && (
              <button 
                onClick={() => { setSearchInput(''); setAppliedSearchQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          
          <Button 
            onClick={applySearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            Cari
          </Button>
        </div>

        {/* Category Pills */}
        <div className="relative mt-3">
          <button
            onClick={() => scrollCategories('left')}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 shadow rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div 
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-9 py-1"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = appliedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-md'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => scrollCategories('right')}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 shadow rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {appliedCategory !== 'all' && (
              <Badge variant="secondary" className={`flex items-center gap-1 ${isDarkMode ? 'bg-gray-800' : ''}`}>
                {categories.find(c => c.id === appliedCategory)?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setAppliedCategory('all')} />
              </Badge>
            )}
            {appliedSearchQuery && (
              <Badge variant="secondary" className={`flex items-center gap-1 ${isDarkMode ? 'bg-gray-800' : ''}`}>
                "{appliedSearchQuery}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setAppliedSearchQuery(''); setSearchInput(''); }} />
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-blue-500 hover:underline">
              Hapus semua
            </button>
          </div>
        )}

        {/* Results Count */}
        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {isLoading ? 'Memuat...' : `Menampilkan ${filteredProducts.length} produk`}
        </p>
      </div>

      {/* Products Grid - Ultra Fast dengan content-visibility */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductSkeleton key={i} isDarkMode={isDarkMode} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Search className={`h-6 w-6 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Tidak ada layanan yang ditemukan</p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Hapus Filter
              </Button>
            )}
          </div>
        ) : (
          <div 
            className="grid grid-cols-2 gap-3"
            style={{ contentVisibility: 'auto' }}
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                avgPrice={avgPrice}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { HomeSection };
