import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, X, Sparkles, Zap, History, TrendingUp, 
  Command, ArrowRight, Loader2, SlidersHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import { ProductService, type Product } from '@/lib/db';

interface SearchResult {
  product: Product;
  score: number;
  matchedFields: string[];
}

interface UltraSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fuzzy search algorithm
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

// Highlight matching text
function HighlightText({ text, query, className }: { text: string; query: string; className?: string }) {
  if (!query) return <span>{text}</span>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-accent/40 text-primary font-bold rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export function UltraSearch({ isOpen, onClose }: UltraSearchProps) {
  const { addToCart } = useAppStore();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: 'all',
    minRating: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  const addToHistory = useCallback((term: string) => {
    setSearchHistory(prev => {
      const newHistory = [term, ...prev.filter(h => h !== term)].slice(0, 10);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      ProductService.getAll()
        .then(setProducts)
        .finally(() => setIsLoading(false));
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    products.forEach(product => {
      let totalScore = 0;
      const matchedFields: string[] = [];
      
      const titleMatch = fuzzyMatch(product.title, query);
      if (titleMatch.match) {
        totalScore += titleMatch.score * 3;
        matchedFields.push('title');
      }
      
      const descMatch = fuzzyMatch(product.description, query);
      if (descMatch.match) {
        totalScore += descMatch.score * 1.5;
        matchedFields.push('description');
      }
      
      product.tags.forEach(tag => {
        const tagMatch = fuzzyMatch(tag, query);
        if (tagMatch.match) {
          totalScore += tagMatch.score * 2;
          matchedFields.push('tags');
        }
      });
      
      if (product.category.toLowerCase().includes(queryLower)) {
        totalScore += 50;
        matchedFields.push('category');
      }
      
      product.tiers.forEach(tier => {
        if (tier.name.toLowerCase().includes(queryLower)) {
          totalScore += 40;
          matchedFields.push('tier');
        }
      });
      
      if (filters.category !== 'all' && product.category !== filters.category) {
        return;
      }
      
      if (filters.minRating > 0 && product.rating < filters.minRating) {
        return;
      }
      
      if (filters.priceRange !== 'all') {
        const lowestPrice = Math.min(...product.tiers.map(t => t.price));
        const [min, max] = filters.priceRange.split('-').map(v => 
          v === 'plus' ? Infinity : parseInt(v) * 1000
        );
        if (lowestPrice < min || (max && lowestPrice > max)) {
          return;
        }
      }
      
      if (totalScore > 0) {
        results.push({ product, score: totalScore, matchedFields });
      }
    });
    
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, products, filters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex].product);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults]);

  const handleSelect = (product: Product) => {
    addToCart(product, product.tiers[0]?.name || '');
    addToHistory(query);
    audioService.playSuccess();
    onClose();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
    audioService.playClick();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div 
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl shadow-soft-lg overflow-hidden bg-card border border-border">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-primary">
                Pencarian Produk
              </h2>
              <p className="text-xs text-muted-foreground">
                Cari dengan fuzzy matching & filter cepat
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Cari produk, layanan, atau fitur..."
              className="pl-12 pr-12 py-6 text-lg bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border border-border",
                  showFilters
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-secondary hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </button>
              
              {query && (
                <Badge variant="secondary" className="bg-muted text-primary border border-border">
                  {searchResults.length} hasil
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>↑↓ navigasi</span>
              <span>•</span>
              <span>↵ pilih</span>
              <span>•</span>
              <span>esc tutup</span>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-3 p-3 rounded-xl flex flex-wrap gap-3 bg-background border border-border">
              <select
                value={filters.category}
                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value="all">Semua Kategori</option>
                <option value="installation">Instalasi</option>
                <option value="creative">Kreatif</option>
                <option value="technical">Teknis</option>
              </select>
              
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(f => ({ ...f, priceRange: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value="all">Semua Harga</option>
                <option value="0-50">Dibawah Rp 50rb</option>
                <option value="50-100">Rp 50rb - 100rb</option>
                <option value="100-500">Rp 100rb - 500rb</option>
                <option value="500-plus">Diatas Rp 500rb</option>
              </select>
              
              <select
                value={filters.minRating}
                onChange={(e) => setFilters(f => ({ ...f, minRating: Number(e.target.value) }))}
                className="px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border"
              >
                <option value={0}>Semua Rating</option>
                <option value={4}>4+ Bintang</option>
                <option value={4.5}>4.5+ Bintang</option>
                <option value={4.8}>4.8+ Bintang</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">Memuat produk...</p>
            </div>
          ) : query ? (
            searchResults.length > 0 ? (
              <div className="p-2">
                {searchResults.map(({ product, matchedFields }, index) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all border border-transparent",
                      selectedIndex === index
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <img
                      src={product.icon}
                      alt={product.title}
                      className="w-12 h-12 rounded-lg object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate text-primary">
                          <HighlightText text={product.title} query={query} />
                        </h4>
                        {selectedIndex === index && (
                          <ArrowRight className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm truncate text-muted-foreground">
                        <HighlightText 
                          text={product.description.slice(0, 60) + '...'} 
                          query={query} 
                        />
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-primary font-semibold text-sm">
                          Rp {Math.min(...product.tiers.map(t => t.price)).toLocaleString('id-ID')}
                        </span>
                        <span className="text-accent text-xs font-bold">★ {product.rating}</span>
                        {matchedFields.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Match: {matchedFields.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground">
                  Tidak ada hasil untuk "{query}"
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Coba kata kunci lain atau periksa ejaan
                </p>
              </div>
            )
          ) : (
            <div className="p-4">
              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-primary">
                      <History className="h-4 w-4" />
                      Pencarian Terakhir
                    </h3>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-destructive hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="px-3 py-1.5 rounded-full text-sm transition-colors bg-background border border-border text-secondary hover:bg-muted"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trending */}
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  Populer
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['WiFi Installation', 'CCTV Security', 'VPS Hosting', 'Video Editing'].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 rounded-full text-sm transition-colors bg-muted border border-border text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default UltraSearch;
