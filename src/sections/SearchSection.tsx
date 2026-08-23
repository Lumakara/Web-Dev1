import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, X, History, TrendingUp, SlidersHorizontal,
  ArrowLeft, Star, Loader2, Sparkles, Zap,
  Wrench, Palette, Code, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { audioService } from '@/lib/audio';
import { ProductService, type Product } from '@/lib/db';

// ============================================================
// Source of truth: UltraSearch.tsx fuzzyMatch + HighlightText
// ============================================================

interface SearchResult {
  product: Product;
  score: number;
  matchedFields: string[];
}

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  if (textLower === queryLower) return { match: true, score: 100 };
  if (textLower.includes(queryLower)) return { match: true, score: 80 };
  let queryIdx = 0;
  let score = 0;
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) { score += 10; queryIdx++; }
  }
  return { match: queryIdx === queryLower.length, score: score > 0 ? score : 0 };
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-accent/40 text-primary font-bold rounded px-0.5 not-italic">{part}</mark>
          : part
      )}
    </span>
  );
}

const HISTORY_KEY = 'search_history'; // same key as UltraSearch
const POPULAR_TERMS = ['WiFi Installation', 'CCTV Security', 'VPS Hosting', 'Video Editing'];
const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: Sparkles },
  { id: 'installation', label: 'Instalasi', icon: Wrench },
  { id: 'creative', label: 'Kreatif', icon: Palette },
  { id: 'technical', label: 'Teknis', icon: Code },
] as const;

function formatPrice(price: number) {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SearchSection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore query from URL on mount for back-navigation persistence
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: 'all',
    minRating: 0,
    sortBy: 'relevance' as 'relevance' | 'price_asc' | 'price_desc' | 'rating',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Load products once on mount
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    ProductService.getAll()
      .then(setProducts)
      .catch((err) => {
        console.error('[SearchSection] Failed to load products:', err);
        setLoadError('Gagal memuat produk. Coba muat ulang halaman.');
      })
      .finally(() => setIsLoading(false));

    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch { /* ignore */ }

    // Focus input on desktop
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Sync query to URL — so back navigation restores state
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query !== current) {
      if (query) setSearchParams({ q: query }, { replace: true });
      else setSearchParams({}, { replace: true });
    }
  }, [query, searchParams, setSearchParams]);

  const addToHistory = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setSearchHistory(prev => {
      const next = [t, ...prev.filter(h => h !== t)].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    audioService.playClick();
  }, []);

  // ponytail: O(n) scan per useMemo — fine for ~50 products; add indexing when > 500
  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim() || !products.length) return [];
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    products.forEach(product => {
      let totalScore = 0;
      const matchedFields: string[] = [];

      const titleMatch = fuzzyMatch(product.title, query);
      if (titleMatch.match) { totalScore += titleMatch.score * 3; matchedFields.push('title'); }

      const descMatch = fuzzyMatch(product.description, query);
      if (descMatch.match) { totalScore += descMatch.score * 1.5; matchedFields.push('description'); }

      product.tags.forEach(tag => {
        const m = fuzzyMatch(tag, query);
        if (m.match) { totalScore += m.score * 2; matchedFields.push('tags'); }
      });

      if (product.category.toLowerCase().includes(queryLower)) {
        totalScore += 50; matchedFields.push('category');
      }

      product.tiers.forEach(tier => {
        if (tier.name.toLowerCase().includes(queryLower)) {
          totalScore += 40; matchedFields.push('tier');
        }
      });

      // Category filter
      if (filters.category !== 'all' && product.category !== filters.category) return;
      // Rating filter
      if (filters.minRating > 0 && product.rating < filters.minRating) return;
      // Price filter
      if (filters.priceRange !== 'all') {
        const lowestPrice = Math.min(...product.tiers.map(t => t.price));
        const [min, max] = filters.priceRange.split('-').map(v =>
          v === 'plus' ? Infinity : parseInt(v) * 1000
        );
        if (lowestPrice < min || (max && lowestPrice > max)) return;
      }

      if (totalScore > 0) results.push({ product, score: totalScore, matchedFields });
    });

    // Sort
    results.sort((a, b) => {
      if (filters.sortBy === 'price_asc') {
        return Math.min(...a.product.tiers.map(t => t.price)) - Math.min(...b.product.tiers.map(t => t.price));
      }
      if (filters.sortBy === 'price_desc') {
        return Math.min(...b.product.tiers.map(t => t.price)) - Math.min(...a.product.tiers.map(t => t.price));
      }
      if (filters.sortBy === 'rating') return b.product.rating - a.product.rating;
      return b.score - a.score; // relevance
    });

    return results.slice(0, 20);
  }, [query, products, filters]);

  // Popular products for empty state (top rated)
  const popularProducts = useMemo(() =>
    [...products].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [products]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const result = searchResults[selectedIndex];
        if (result) handleSelect(result.product);
      } else if (e.key === 'Escape') {
        if (query) setQuery('');
        else navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchResults, selectedIndex, query, navigate]);

  // Reset selectedIndex when results change
  useEffect(() => setSelectedIndex(0), [query, filters]);

  const handleSelect = useCallback((product: Product) => {
    addToHistory(query);
    audioService.playClick();
    navigate(`/product/${product.id}`);
  }, [query, navigate, addToHistory]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
  }, []);

  const showEmptyState = !query.trim();
  const activeFiltersCount = [
    filters.category !== 'all',
    filters.priceRange !== 'all',
    filters.minRating > 0,
    filters.sortBy !== 'relevance',
  ].filter(Boolean).length;

  return (
    <div className="pb-20 min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-[56px] z-30 bg-card border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Search bar row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Cari produk, layanan, atau fitur..."
                className="pl-9 pr-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                autoComplete="off"
                aria-label="Cari produk"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => { setShowFilters(!showFilters); audioService.playClick(); }}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border transition-colors",
                showFilters || activeFiltersCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-secondary hover:bg-muted"
              )}
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="text-xs font-bold">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-3 p-3 rounded-xl flex flex-wrap gap-2 bg-background border border-border">
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="px-3 py-1.5 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <select
                value={filters.priceRange}
                onChange={e => setFilters(f => ({ ...f, priceRange: e.target.value }))}
                className="px-3 py-1.5 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value="all">Semua Harga</option>
                <option value="0-50">Di bawah Rp 50rb</option>
                <option value="50-100">Rp 50rb – 100rb</option>
                <option value="100-500">Rp 100rb – 500rb</option>
                <option value="500-plus">Di atas Rp 500rb</option>
              </select>

              <select
                value={filters.minRating}
                onChange={e => setFilters(f => ({ ...f, minRating: Number(e.target.value) }))}
                className="px-3 py-1.5 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value={0}>Semua Rating</option>
                <option value={4}>4+ Bintang</option>
                <option value={4.5}>4.5+ Bintang</option>
                <option value={4.8}>4.8+ Bintang</option>
              </select>

              <select
                value={filters.sortBy}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as typeof filters.sortBy }))}
                className="px-3 py-1.5 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value="relevance">Relevansi</option>
                <option value="price_asc">Harga ↑</option>
                <option value="price_desc">Harga ↓</option>
                <option value="rating">Rating</option>
              </select>

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => setFilters({ category: 'all', priceRange: 'all', minRating: 0, sortBy: 'relevance' })}
                  className="px-3 py-1.5 rounded-lg text-sm text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Result count + keyboard hint */}
          {query && !isLoading && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {searchResults.length} hasil untuk <span className="font-medium text-primary">"{query}"</span>
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">↑↓ navigasi &nbsp;·&nbsp; ↵ buka &nbsp;·&nbsp; Esc hapus</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Memuat produk...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-destructive font-medium">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-secondary transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        ) : showEmptyState ? (
          /* Empty state: recent searches + popular */
          <div className="space-y-6">
            {searchHistory.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <History className="h-4 w-4" />
                    Pencarian Terakhir
                  </h2>
                  <button onClick={clearHistory} className="text-xs text-destructive hover:underline">
                    Hapus
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map(term => (
                    <button
                      key={term}
                      onClick={() => { setQuery(term); audioService.playClick(); }}
                      className="px-3 py-1.5 rounded-full text-sm bg-background border border-border text-secondary hover:border-primary hover:text-primary transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
                <TrendingUp className="h-4 w-4" />
                Populer
              </h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TERMS.map(term => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); audioService.playClick(); }}
                    className="px-3 py-1.5 rounded-full text-sm bg-muted border border-border text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            {/* Kategori */}
            <section>
              <h2 className="text-sm font-semibold mb-3 text-primary">Kategori</h2>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setFilters(f => ({ ...f, category: cat.id })); setShowFilters(true); audioService.playClick(); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-muted transition-colors text-sm font-medium text-secondary"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Popular products */}
            {popularProducts.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
                  <Sparkles className="h-4 w-4" />
                  Rekomendasi
                </h2>
                <div className="space-y-2">
                  {popularProducts.map(product => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      query=""
                      selected={false}
                      onClick={() => handleSelect(product)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : searchResults.length > 0 ? (
          /* Search results */
          <div className="space-y-2">
            {searchResults.map(({ product, matchedFields }, index) => (
              <ProductRow
                key={product.id}
                product={product}
                query={query}
                selected={selectedIndex === index}
                onClick={() => handleSelect(product)}
                onMouseEnter={() => setSelectedIndex(index)}
                matchedFields={matchedFields}
              />
            ))}
          </div>
        ) : (
          /* No results */
          <div className="text-center py-20">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-primary font-semibold">Tidak ada hasil untuk "{query}"</p>
            <p className="text-sm text-muted-foreground mt-1">Coba kata kunci lain atau hapus filter</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters({ category: 'all', priceRange: 'all', minRating: 0, sortBy: 'relevance' })}
                className="mt-4 px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Hapus Filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT ROW — reusable result item
// ============================================================

interface ProductRowProps {
  product: Product;
  query: string;
  selected: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  matchedFields?: string[];
}

function ProductRow({ product, query, selected, onClick, onMouseEnter, matchedFields }: ProductRowProps) {
  const lowestPrice = Math.min(...product.tiers.map(t => t.price));
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
        selected
          ? "bg-primary/10 border-primary"
          : "border-transparent hover:bg-muted hover:border-border"
      )}
    >
      <img
        src={product.icon}
        alt={product.title}
        className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate text-primary">
            {query ? <HighlightText text={product.title} query={query} /> : product.title}
          </h3>
          {selected && <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {query
            ? <HighlightText text={product.description.slice(0, 70) + '…'} query={query} />
            : product.description.slice(0, 70) + '…'
          }
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-accent">{formatPrice(lowestPrice)}</span>
          <span className="flex items-center gap-0.5 text-xs text-accent font-bold">
            <Star className="h-3 w-3 fill-accent" />{product.rating}
          </span>
          {matchedFields && matchedFields.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted border-border text-muted-foreground">
              {matchedFields[0]}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
