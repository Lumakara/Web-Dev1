import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Star, ChevronLeft, ChevronRight, 
  Sparkles, Zap, Headphones, Palette, Code, Wrench, Shield,
  X, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useProducts } from '@/hooks/useProducts';
import { useAppStore } from '@/store/appStore';
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

const HISTORY_KEY = 'home_search_history';
const MAX_HISTORY = 10;

// =============================================================================
// HELPER FUNCTIONS — ported exact from UltraSearch
// =============================================================================

function getProductLabel(product: Product, avgPrice: number): { type: string; label: string } | null {
  if (product.rating >= 4.8 && product.reviews > 100) {
    return { type: 'bestseller', label: '⭐ Best Seller' };
  }
  if (product.base_price < avgPrice * 0.7) {
    return { type: 'cheap', label: '💰 Termurah' };
  }
  if (product.reviews > 150) {
    return { type: 'trending', label: '🔥 Trending' };
  }
  if (product.created_at && new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
    return { type: 'new', label: '✨ Baru' };
  }
  return null;
}

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

// Exact port from UltraSearch.tsx
function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower === queryLower) return { match: true, score: 100 };
  if (textLower.includes(queryLower)) return { match: true, score: 80 };
  
  let queryIdx = 0;
  let score = 0;
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }
  
  return { match: queryIdx === queryLower.length, score: score > 0 ? score : 0 };
}

// Exact port from UltraSearch.tsx
function HighlightText({ text, query, className }: { text: string; query: string; className?: string }) {
  if (!query) return <span className={className}>{text}</span>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-accent/40 text-primary font-bold rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history: string[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// =============================================================================
// PRODUCT CARD COMPONENT
// =============================================================================

interface ProductCardProps {
  product: Product;
  avgPrice: number;
  query?: string;
  selected?: boolean;
}

const ProductCard = memo(function ProductCard({ 
  product, 
  avgPrice,
  query = '',
  selected = false,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { cart } = useAppStore();
  
  const price = product.discount_price || product.base_price;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.discount_price || 0)) / product.base_price) * 100)
    : 0;
  
  const label = useMemo(() => getProductLabel(product, avgPrice), [product, avgPrice]);
  
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
      className={`rounded-xl shadow-soft border bg-card overflow-hidden cursor-pointer transform transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg group ${
        selected 
          ? 'border-primary ring-2 ring-primary/20 -translate-y-1' 
          : 'border-border hover:border-secondary'
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-background p-4 flex items-center justify-center">
        <img
          src={product.icon}
          alt={product.title}
          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Product Label */}
        {label && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-primary shadow-xs">
            {label.label}
          </div>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-xs">
            -{discountPercent}%
          </div>
        )}
        
        {/* Cart Badge */}
        {cartItem && (
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-xs">
            {cartItem.quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 bg-card border-t border-border">
        <h3 className="font-bold text-sm truncate text-primary group-hover:text-secondary transition-colors">
          <HighlightText text={product.title} query={query} />
        </h3>
        <p className="text-xs line-clamp-1 mt-0.5 text-muted-foreground">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-sm font-bold text-accent">
              {formatPrice(price)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] line-through text-muted-foreground">
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
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Navigation Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
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
  
  const [searchInput, setSearchInput] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [showHero, setShowHero] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowHero(true), 50);
    setSearchHistory(loadHistory());
    return () => clearTimeout(timer);
  }, []);

  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.base_price, 0) / products.length;
  }, [products]);

  const handleCategoryClick = useCallback((catId: string) => {
    audioService.playClick();
    setAppliedCategory(catId);
    setSelectedIndex(0);
  }, []);

  // Fuzzy filtered + scored — reactive to searchInput directly (no Enter needed)
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    let result = products;
    
    if (appliedCategory !== 'all') {
      result = result.filter(p => p.category === appliedCategory);
    }
    
    const q = searchInput.trim();
    if (!q) return result;
    
    // Score each product across all searchable fields
    const scored = result.map(product => {
      const titleMatch = fuzzyMatch(product.title, q);
      const descMatch = fuzzyMatch(product.description, q);
      const tagScores = product.tags.map(tag => fuzzyMatch(tag, q).score);
      const categoryMatch = fuzzyMatch(product.category, q);
      const tierScores = (product.tiers || []).map(t => fuzzyMatch(t.name, q).score);
      
      const score = 
        titleMatch.score * 3 +
        descMatch.score * 1.5 +
        Math.max(0, ...tagScores) * 2 +
        categoryMatch.score +
        Math.max(0, ...tierScores);
      
      return { product, score, match: score > 0 };
    });
    
    return scored
      .filter(s => s.match)
      .sort((a, b) => b.score - a.score)
      .map(s => s.product);
  }, [products, appliedCategory, searchInput]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredProducts.length, searchInput]);

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const clearFilters = useCallback(() => {
    audioService.playClick();
    setAppliedCategory('all');
    setSearchInput('');
    setSelectedIndex(0);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && searchInput.trim()) {
      e.preventDefault();
      const target = filteredProducts[selectedIndex];
      if (target) {
        addToHistory(searchInput);
        audioService.playClick();
        navigate(`/product/${target.id}`);
      }
    } else if (e.key === 'Escape') {
      setSearchInput('');
      setSelectedIndex(0);
    }
  }, [filteredProducts, selectedIndex, searchInput, navigate, addToHistory]);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  }, []);

  const activeFiltersCount = useMemo(() => {
    return [appliedCategory !== 'all', searchInput.trim() !== ''].filter(Boolean).length;
  }, [appliedCategory, searchInput]);

  const showHistory = searchInput === '' && searchHistory.length > 0;

  return (
    <div className="pb-20 min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      {showHero && <HeroBanner />}

      {/* Search & Filter Bar */}
      <div className="sticky top-[56px] z-30 px-4 py-3 bg-card border-b border-border shadow-soft">
        <div className="max-w-5xl mx-auto">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="Cari layanan digital..."
              className="pl-9 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              aria-label="Cari produk"
            />
            {searchInput && (
              <button 
                onClick={() => { setSearchInput(''); setSelectedIndex(0); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search History Pills */}
          {showHistory && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
              <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {searchHistory.slice(0, 6).map(term => (
                <button
                  key={term}
                  onClick={() => setSearchInput(term)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted text-secondary border border-border hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  {term}
                </button>
              ))}
              <button
                onClick={clearHistory}
                className="shrink-0 text-xs text-destructive hover:underline ml-1 whitespace-nowrap"
              >
                Hapus
              </button>
            </div>
          )}
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
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 mt-2 max-w-5xl mx-auto flex-wrap">
            {appliedCategory !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-muted text-primary border-border">
                {categories.find(c => c.id === appliedCategory)?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setAppliedCategory('all')} />
              </Badge>
            )}
            {searchInput.trim() && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-muted text-primary border-border">
                "{searchInput}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchInput('')} />
              </Badge>
            )}
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
            {searchInput.trim() ? (
              <>
                <p className="text-primary font-semibold">Tidak ada hasil untuk "{searchInput}"</p>
                <p className="text-xs text-muted-foreground mt-1">Coba kata kunci lain atau hapus filter</p>
              </>
            ) : (
              <>
                <p className="text-primary font-semibold">Tidak ada layanan yang ditemukan</p>
                <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan filter Anda</p>
              </>
            )}
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4 border-border" onClick={clearFilters}>
                Hapus Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                avgPrice={avgPrice}
                query={searchInput}
                selected={searchInput.trim() !== '' && index === selectedIndex}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { HomeSection };
