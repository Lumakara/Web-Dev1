import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, X, History, TrendingUp, SlidersHorizontal,
  ArrowLeft, Star, Loader2, Sparkles, Zap,
  Wrench, Palette, Code, ArrowRight, Check
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

const HISTORY_KEY = 'search_history';
const POPULAR_TERMS = ['WiFi Installation', 'CCTV Security', 'VPS Hosting', 'Video Editing'];
const CATEGORIES = [
  { id: 'installation', label: 'Instalasi', icon: Wrench },
  { id: 'creative', label: 'Kreatif', icon: Palette },
  { id: 'technical', label: 'Teknis', icon: Code },
] as const;

const PRICE_RANGES = [
  { id: 'all', label: 'Semua Harga' },
  { id: '0-50', label: 'Di bawah Rp 50rb' },
  { id: '50-150', label: 'Rp 50rb – 150rb' },
  { id: '150-500', label: 'Rp 150rb – 500rb' },
  { id: '500-plus', label: 'Di atas Rp 500rb' },
] as const;

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevansi' },
  { id: 'price_asc', label: 'Harga: Murah ke Mahal' },
  { id: 'price_desc', label: 'Harga: Mahal ke Murah' },
  { id: 'rating', label: 'Rating Tertinggi' },
] as const;

type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'rating';

interface Filters {
  categories: string[];   // multi-select: [], ['installation'], ['installation','creative'], etc.
  priceRange: string;     // single: 'all' | '0-50' | ...
  minRating: number;      // 0 | 4.5 | 4.7 | 4.9
  sortBy: SortBy;
}

const DEFAULT_FILTERS: Filters = {
  categories: [],
  priceRange: 'all',
  minRating: 0,
  sortBy: 'relevance',
};

function countActiveFilters(f: Filters): number {
  return [
    f.categories.length > 0,
    f.priceRange !== 'all',
    f.minRating > 0,
    f.sortBy !== 'relevance',
  ].filter(Boolean).length;
}

function formatPrice(price: number) {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

// ============================================================
// FILTER SHEET — bottom sheet (mobile) + centered modal (desktop)
// ============================================================

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  draft: Filters;
  setDraft: (f: Filters) => void;
  onApply: () => void;
  onReset: () => void;
}

function FilterSheet({ open, onClose, draft, setDraft, onApply, onReset }: FilterSheetProps) {
  const activeCount = countActiveFilters(draft);

  // Trap focus and Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggleCategory = (id: string) => {
    const next = draft.categories.includes(id)
      ? draft.categories.filter(c => c !== id)
      : [...draft.categories, id];
    setDraft({ ...draft, categories: next });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — bottom on mobile, centered on sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter pencarian"
        className={cn(
          "fixed z-[61] bg-card border border-border shadow-soft-lg flex flex-col",
          // Mobile: bottom sheet, max 85% viewport height
          "inset-x-0 bottom-0 rounded-t-2xl max-h-[85dvh]",
          // Desktop: centered modal
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md sm:rounded-2xl sm:max-h-[90dvh]"
        )}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base text-foreground">Filter</h2>
            {activeCount > 0 && (
              <p className="text-xs text-muted-foreground">{activeCount} filter aktif</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Tutup filter"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">

          {/* Kategori — multi-select pill */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Kategori</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = draft.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-secondary border-border hover:border-primary hover:text-primary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Harga — single select */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Kisaran Harga</h3>
            <div className="space-y-1.5">
              {PRICE_RANGES.map(range => {
                const active = draft.priceRange === range.id;
                return (
                  <button
                    key={range.id}
                    onClick={() => setDraft({ ...draft, priceRange: range.id })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all text-left",
                      active
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-background border-border text-secondary hover:border-primary hover:bg-muted"
                    )}
                  >
                    {range.label}
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Rating minimum — single select */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Rating Minimum</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 0, label: 'Semua' },
                { value: 4.5, label: '4.5+ ★' },
                { value: 4.7, label: '4.7+ ★' },
                { value: 4.9, label: '4.9+ ★' },
              ].map(opt => {
                const active = draft.minRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDraft({ ...draft, minRating: opt.value })}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-secondary border-border hover:border-primary hover:text-primary"
                    )}
                  >
                    {opt.label}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Urutan — single select */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Urutkan</h3>
            <div className="space-y-1.5">
              {SORT_OPTIONS.map(opt => {
                const active = draft.sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setDraft({ ...draft, sortBy: opt.id as SortBy })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all text-left",
                      active
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-background border-border text-secondary hover:border-primary hover:bg-muted"
                    )}
                  >
                    {opt.label}
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Padding bawah agar tidak tertutup sticky footer */}
          <div className="h-2" />
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border bg-card px-5 py-4 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-secondary hover:bg-muted transition-colors"
          >
            Atur Ulang
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors"
          >
            Terapkan{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SearchSection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Applied filters (drive results)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Draft filters (in-modal, not applied until user taps Terapkan)
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

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

    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Sync query to URL
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query !== current) {
      if (query) setSearchParams({ q: query }, { replace: true });
      else setSearchParams({}, { replace: true });
    }
  }, [query, searchParams, setSearchParams]);

  const openFilterSheet = useCallback(() => {
    setDraftFilters(filters); // sync draft to current applied
    setShowFilterSheet(true);
    audioService.playClick();
  }, [filters]);

  const closeFilterSheet = useCallback(() => setShowFilterSheet(false), []);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    setShowFilterSheet(false);
    audioService.playClick();
  }, [draftFilters]);

  const resetDraft = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
  }, []);

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

      // Category filter (multi-select: empty = all)
      if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return;
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
      return b.score - a.score;
    });

    return results.slice(0, 20);
  }, [query, products, filters]);

  const popularProducts = useMemo(() =>
    [...products].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [products]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showFilterSheet) return; // let sheet handle Escape
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
  }, [searchResults, selectedIndex, query, navigate, showFilterSheet]);

  useEffect(() => setSelectedIndex(0), [query, filters]);

  const handleSelect = useCallback((product: Product) => {
    addToHistory(query);
    audioService.playClick();
    navigate(`/product/${product.id}`);
  }, [query, navigate, addToHistory]);

  const handleQueryChange = useCallback((val: string) => setQuery(val), []);

  const showEmptyState = !query.trim();
  const activeFiltersCount = countActiveFilters(filters);

  return (
    <div className="pb-20 min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-soft">
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

            {/* Filter button */}
            <button
              onClick={openFilterSheet}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
                activeFiltersCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-secondary border-border hover:bg-muted"
              )}
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="text-xs font-bold">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* Active filter chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto scrollbar-hide">
              {filters.categories.map(catId => {
                const cat = CATEGORIES.find(c => c.id === catId);
                return cat ? (
                  <Badge
                    key={catId}
                    variant="secondary"
                    className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-pointer"
                    onClick={() => setFilters(f => ({ ...f, categories: f.categories.filter(c => c !== catId) }))}
                  >
                    {cat.label}
                    <X className="h-3 w-3" />
                  </Badge>
                ) : null;
              })}
              {filters.priceRange !== 'all' && (
                <Badge
                  variant="secondary"
                  className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-pointer"
                  onClick={() => setFilters(f => ({ ...f, priceRange: 'all' }))}
                >
                  {PRICE_RANGES.find(p => p.id === filters.priceRange)?.label}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.minRating > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-pointer"
                  onClick={() => setFilters(f => ({ ...f, minRating: 0 }))}
                >
                  {filters.minRating}+ ★
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.sortBy !== 'relevance' && (
                <Badge
                  variant="secondary"
                  className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-pointer"
                  onClick={() => setFilters(f => ({ ...f, sortBy: 'relevance' }))}
                >
                  {SORT_OPTIONS.find(s => s.id === filters.sortBy)?.label}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="shrink-0 text-xs text-destructive hover:underline whitespace-nowrap"
              >
                Hapus semua
              </button>
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

            <section>
              <h2 className="text-sm font-semibold mb-3 text-primary">Kategori</h2>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const next = { ...DEFAULT_FILTERS, categories: [cat.id] };
                        setFilters(next);
                        setDraftFilters(next);
                        audioService.playClick();
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-muted transition-colors text-sm font-medium text-secondary"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </section>

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
          <div className="text-center py-20">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-primary font-semibold">Tidak ada hasil untuk "{query}"</p>
            <p className="text-sm text-muted-foreground mt-1">Coba kata kunci lain atau hapus filter</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Hapus Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        open={showFilterSheet}
        onClose={closeFilterSheet}
        draft={draftFilters}
        setDraft={setDraftFilters}
        onApply={applyFilters}
        onReset={resetDraft}
      />
    </div>
  );
}

// ============================================================
// PRODUCT ROW
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
