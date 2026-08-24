import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Star, ChevronLeft, ChevronRight, 
  Sparkles, Zap, Headphones, Palette, Code, Wrench, Shield,
  X, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useProducts } from '@/hooks/useProducts';
import { useAppStore } from '@/store/appStore';
import { useWishlist } from '@/hooks/useWishlist';
import { audioService } from '@/lib/audio';
import type { Product } from '@/lib/db';

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

function getProductLabel(product: Product, avgPrice: number): { type: string; label: string } | null {
  if (product.rating >= 4.8 && product.reviews > 100) return { type: 'bestseller', label: '⭐ Best Seller' };
  if (product.base_price < avgPrice * 0.7) return { type: 'cheap', label: '💰 Termurah' };
  if (product.reviews > 150) return { type: 'trending', label: '🔥 Trending' };
  if (product.created_at && new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) return { type: 'new', label: '✨ Baru' };
  return null;
}

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

// =============================================================================
// PRODUCT CARD COMPONENT
// =============================================================================

interface ProductCardProps {
  product: Product;
  avgPrice: number;
}

const ProductCard = memo(function ProductCard({ product, avgPrice }: ProductCardProps) {
  const navigate = useNavigate();
  const { cart } = useAppStore();
  const { favorites, toggle } = useWishlist();
  
  const price = product.discount_price || product.base_price;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.discount_price || 0)) / product.base_price) * 100)
    : 0;
  
  const label = useMemo(() => getProductLabel(product, avgPrice), [product, avgPrice]);
  const cartItem = useMemo(() => cart.find(item => item.productId === product.id), [cart, product.id]);
  const isFav = favorites.includes(product.id);

  const handleClick = useCallback(() => {
    audioService.playClick();
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(product.id);
  }, [toggle, product.id]);

  return (
    <div
      onClick={handleClick}
      className="rounded-xl shadow-soft border border-border bg-card overflow-hidden cursor-pointer transform transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg hover:border-secondary group"
    >
      <div className="relative aspect-square bg-background p-4 flex items-center justify-center">
        <img
          src={product.icon}
          alt={product.title}
          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:scale-110 transition-transform z-10"
          aria-label={isFav ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </button>
        {label && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-primary shadow-xs">
            {label.label}
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-xs">
            -{discountPercent}%
          </div>
        )}
        {cartItem && (
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-xs">
            {cartItem.quantity}
          </div>
        )}
      </div>
      <div className="p-3 bg-card border-t border-border">
        <h3 className="font-bold text-sm truncate text-primary group-hover:text-secondary transition-colors">
          {product.title}
        </h3>
        <p className="text-xs line-clamp-1 mt-0.5 text-muted-foreground">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-sm font-bold text-accent">{formatPrice(price)}</span>
            {hasDiscount && (
              <span className="text-[10px] line-through text-muted-foreground ml-1">
                {formatPrice(product.base_price)}
              </span>
            )}
          </div>
          <div className="flex items-center text-accent text-xs font-bold">
            <Star className="h-3 w-3 fill-accent text-accent mr-0.5" />
            <span>{product.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// HERO BANNER COMPONENT
// =============================================================================

const slides = [
  { title: 'Solusi Digital Terbaik', subtitle: 'Layanan profesional untuk kebutuhan teknologi Anda', icon: Zap },
  { title: 'Instalasi WiFi Cepat', subtitle: 'Tim teknisi berpengalaman siap membantu', icon: Zap },
  { title: 'CCTV Security System', subtitle: 'Proteksi 24/7 untuk keamanan Anda', icon: Shield },
  { title: 'Editing Profesional', subtitle: 'Foto & video editing berkualitas tinggi', icon: Headphones },
];

const HeroBanner = memo(function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Autonomy: once the user picks a slide, stop rotating. Reduced-motion users
  // never get auto-rotation at all.
  const [userTook, setUserTook] = useState(false);

  useEffect(() => {
    if (userTook) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [userTook]);

  return (
    <div className="relative h-44 overflow-hidden bg-primary text-primary-foreground border-b border-border shadow-soft">
      {slides.map((slide, index) => {
        const Icon = slide.icon;
        const isActive = index === currentSlide;
        return (
          <div
            key={index}
            className={`absolute inset-0 flex items-center justify-center bg-primary px-6 transition-opacity duration-500 ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="text-center text-primary-foreground max-w-md">
              <div className="w-12 h-12 mx-auto mb-2 bg-accent/20 border border-accent/40 rounded-2xl flex items-center justify-center">
                <Icon className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-primary-foreground">{slide.title}</h2>
              <p className="text-primary-foreground/80 mt-1 text-xs">{slide.subtitle}</p>
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => { setUserTook(true); setCurrentSlide(index); }}
            aria-label={`Slide ${index + 1}`}
            aria-current={currentSlide === index}
            className={`h-1.5 rounded-full transition-all ${
              currentSlide === index ? 'bg-accent w-5' : 'bg-primary-foreground/40 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// SKELETON LOADER
// =============================================================================

function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border shadow-xs">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
        <div className="flex justify-between pt-2">
          <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN HOME SECTION COMPONENT
// =============================================================================

export default function HomeSection() {
  const { products, isLoading } = useProducts();
  const navigate = useNavigate();
  
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [showHero, setShowHero] = useState(false);
  
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowHero(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.base_price, 0) / products.length;
  }, [products]);

  const handleCategoryClick = useCallback((catId: string) => {
    audioService.playClick();
    setAppliedCategory(catId);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    if (appliedCategory === 'all') return products;
    return products.filter(p => p.category === appliedCategory);
  }, [products, appliedCategory]);

  const clearFilters = useCallback(() => {
    audioService.playClick();
    setAppliedCategory('all');
  }, []);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  }, []);

  const categoryFilterActive = appliedCategory !== 'all';

  return (
    <div className="pb-20 min-h-screen bg-background text-foreground">
      {showHero && <HeroBanner />}

      {/* Search & Filter Bar */}
      <div className="sticky top-0 z-30 px-4 py-3 bg-card border-b border-border shadow-soft">
        <div className="max-w-5xl mx-auto">
          {/* Search Trigger — opens UltraSearch modal */}
          <button
            onClick={() => { audioService.playClick(); navigate('/search'); }}
            className="w-full flex items-center gap-3 pl-9 pr-4 h-9 rounded-md border border-border bg-background text-muted-foreground text-sm hover:border-primary hover:text-foreground transition-colors relative"
            aria-label="Buka pencarian"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
            <span>Cari layanan digital...</span>
            <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Category Pills */}
        <div className="relative mt-3 max-w-5xl mx-auto">
          <button
            onClick={() => scrollCategories('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 shadow-soft border border-border rounded-full flex items-center justify-center bg-card text-foreground hover:bg-muted"
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
                    flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border border-border
                    ${isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-secondary hover:bg-muted'
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
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 shadow-soft border border-border rounded-full flex items-center justify-center bg-card text-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Active Filters */}
        {categoryFilterActive && (
          <div className="flex items-center gap-2 mt-2 max-w-5xl mx-auto flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1 bg-muted text-primary border-border">
              {categories.find(c => c.id === appliedCategory)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setAppliedCategory('all')} />
            </Badge>
            <button onClick={clearFilters} className="text-xs text-primary font-semibold hover:underline">
              Hapus semua
            </button>
          </div>
        )}

        <p className="text-xs mt-2 text-muted-foreground max-w-5xl mx-auto">
          {isLoading ? 'Memuat...' : `Menampilkan ${filteredProducts.length} produk`}
        </p>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-primary font-semibold">Tidak ada layanan yang ditemukan</p>
            <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan filter Anda</p>
            {categoryFilterActive && (
              <Button variant="outline" className="mt-4 border-border" onClick={clearFilters}>
                Hapus Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                avgPrice={avgPrice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { HomeSection };
