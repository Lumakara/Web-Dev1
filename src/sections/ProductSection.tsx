import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, Clock, ShoppingCart, Check, ChevronLeft, ChevronRight,
  Share2, Heart, Shield, Sparkles, Minus, Plus,
  Wifi, Code, Palette, Truck, Headphones, BadgeCheck, 
  ArrowLeft, Package, Info, Zap, Wrench, Camera, Server, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { audioService } from '@/lib/audio';
import { useProducts } from '@/hooks/useProducts';
import { useAppStore } from '@/store/appStore';
import type { Product } from '@/lib/firebase-db';
import { Skeleton } from '@/components/SkeletonLoader';

// =============================================================================
// TYPES
// =============================================================================

interface ProductImageGalleryProps {
  product: Product;
  isDarkMode: boolean;
}

interface ProductInfoProps {
  product: Product;
  isDarkMode: boolean;
}

interface TierSelectorProps {
  product: Product;
  selectedTier: string;
  onSelectTier: (tier: string) => void;
  isDarkMode: boolean;
}

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  isDarkMode: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  installation: Wrench,
  creative: Palette,
  technical: Code,
  wifi: Wifi,
  cctv: Camera,
  vps: Server,
  default: Sparkles,
};

const TRUST_BADGES = [
  { icon: Shield, label: 'Garansi 100%', description: 'Uang kembali jika tidak puas' },
  { icon: Truck, label: 'Instalasi Cepat', description: '1-3 hari kerja' },
  { icon: Headphones, label: 'Support 24/7', description: 'Tim siap membantu' },
  { icon: BadgeCheck, label: 'Teknisi Profesional', description: 'Bersertifikasi' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
}

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

function calculateDiscountPercent(basePrice: number, discountPrice?: number): number {
  if (!discountPrice || discountPrice >= basePrice) return 0;
  return Math.round(((basePrice - discountPrice) / basePrice) * 100);
}



// Check if product is WiFi
function isWiFiProduct(product: Product): boolean {
  return product.id === 'wifi' || product.formType === 'wifi' ||
         product.title.toLowerCase().includes('wifi') || 
         product.title.toLowerCase().includes('wi-fi');
}

// Check if product is Panel
function isPanelProduct(product: Product): boolean {
  return product.id === 'panel' || product.formType === 'panel' ||
         product.title.toLowerCase().includes('pterodactyl');
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Product Image Gallery Component
 */
function ProductImageGallery({ product, isDarkMode }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const images = useMemo(() => {
    const baseImages = [product.image, product.icon].filter(Boolean);
    while (baseImages.length < 4) {
      baseImages.push(product.image || product.icon);
    }
    return baseImages;
  }, [product.image, product.icon]);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    audioService.playClick();
  }, [images.length]);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    audioService.playClick();
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setActiveIndex(index);
    audioService.playClick();
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  }, [touchStart, handleNext, handlePrev]);

  return (
    <div className="relative">
      <div 
        className={cn(
          "relative aspect-square overflow-hidden rounded-2xl",
          isDarkMode ? "bg-gray-800" : "bg-gray-100"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        <img
          src={images[activeIndex]}
          alt={product.title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110",
                isDarkMode ? "bg-gray-900/80 text-white" : "bg-white/90 text-gray-900"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110",
                isDarkMode ? "bg-gray-900/80 text-white" : "bg-white/90 text-gray-900"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleThumbnailClick(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeIndex === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => handleThumbnailClick(idx)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                activeIndex === idx
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : isDarkMode 
                    ? "border-gray-700 opacity-70 hover:opacity-100" 
                    : "border-gray-200 opacity-70 hover:opacity-100"
              )}
            >
              <img 
                src={img} 
                alt={`${product.title} - ${idx + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Product Info Header Component
 */
function ProductInfo({ product, isDarkMode }: ProductInfoProps) {
  const CategoryIcon = getCategoryIcon(product.category);
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = calculateDiscountPercent(product.base_price, product.discount_price);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge 
          variant="secondary" 
          className={cn(
            "capitalize text-xs",
            isDarkMode && "bg-gray-800 text-gray-300"
          )}
        >
          <CategoryIcon className="h-3 w-3 mr-1" />
          {product.category}
        </Badge>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isDarkMode && "border-gray-700 text-gray-400"
          )}
        >
          <Clock className="h-3 w-3 mr-1" />
          {product.duration}
        </Badge>
        {product.stock < 20 && (
          <Badge variant="destructive" className="text-xs animate-pulse">
            Stok Terbatas
          </Badge>
        )}
      </div>

      <h1 className={cn(
        "text-2xl md:text-3xl font-bold leading-tight",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        {product.title}
      </h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500 fill-current" />
          <span className={cn(
            "font-semibold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            {product.rating}
          </span>
          <span className={cn(
            "text-sm",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            ({product.reviews} ulasan)
          </span>
        </div>
        <span className={isDarkMode ? "text-gray-600" : "text-gray-300"}>•</span>
        <span className={cn(
          "text-sm",
          isDarkMode ? "text-gray-400" : "text-gray-500"
        )}>
          Terjual {product.reviews * 12}+
        </span>
      </div>

      <div className={cn(
        "p-4 rounded-2xl mt-4",
        isDarkMode ? "bg-gray-800" : "bg-blue-50"
      )}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={cn(
            "text-3xl font-bold",
            isDarkMode ? "text-white" : "text-blue-700"
          )}>
            {formatPrice(product.discount_price || product.base_price)}
          </span>
          {hasDiscount && (
            <>
              <span className={cn(
                "text-lg line-through",
                isDarkMode ? "text-gray-500" : "text-gray-400"
              )}>
                {formatPrice(product.base_price)}
              </span>
              <Badge className="bg-red-500 text-white">
                -{discountPercent}%
              </Badge>
            </>
          )}
        </div>
        <p className={cn(
          "text-sm mt-1",
          isDarkMode ? "text-gray-400" : "text-gray-600"
        )}>
          Harga sudah termasuk pajak & biaya layanan
        </p>
      </div>
    </div>
  );
}

/**
 * Tier Selector Component
 * Dihilangkan untuk produk WiFi dan Panel (form dipilih di checkout)
 */
function TierSelector({ product, selectedTier, onSelectTier, isDarkMode }: TierSelectorProps) {
  const { cart } = useAppStore();

  const getCartInfo = useCallback((tierName: string) => {
    const item = cart.find(item => item.productId === product.id && item.tier === tierName);
    return item ? { inCart: true, quantity: item.quantity } : { inCart: false, quantity: 0 };
  }, [cart, product.id]);

  return (
    <div className="space-y-3">
      <h3 className={cn(
        "font-semibold flex items-center gap-2",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        <Package className="h-4 w-4 text-blue-500" />
        Pilih Paket
      </h3>
      
      <div className="grid gap-2">
        {product.tiers.map((tier) => {
          const isSelected = selectedTier === tier.name;
          const { inCart, quantity } = getCartInfo(tier.name);
          
          return (
            <button
              key={tier.name}
              onClick={() => {
                onSelectTier(tier.name);
                audioService.playClick();
              }}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                  : isDarkMode
                    ? "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                    : "border-gray-200 hover:border-blue-300 bg-white"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              <div className="flex justify-between items-start pr-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {tier.name}
                    </span>
                    {inCart && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        {quantity} di keranjang
                      </Badge>
                    )}
                  </div>
                  
                  <ul className="mt-2 space-y-1">
                    {tier.features.slice(0, 4).map((feature, idx) => (
                      <li 
                        key={idx} 
                        className={cn(
                          "text-xs flex items-start",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        <Check className="h-3 w-3 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {tier.features.length > 4 && (
                      <li className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                      )}>
                        +{tier.features.length - 4} fitur lainnya
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="text-right ml-4">
                  <span className="text-blue-600 font-bold text-lg">
                    {formatPrice(tier.price)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Quantity Selector Component
 */
function QuantitySelector({ quantity, onChange, isDarkMode }: QuantitySelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className={cn(
        "font-semibold",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        Jumlah
      </h3>
      
      <div className={cn(
        "inline-flex items-center gap-2 p-1.5 rounded-xl border",
        isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
      )}>
        <button
          onClick={() => onChange(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600",
            "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
        
        <span className={cn(
          "w-12 text-center font-bold text-lg",
          isDarkMode ? "text-white" : "text-gray-900"
        )}>
          {quantity}
        </span>
        
        <button
          onClick={() => onChange(quantity + 1)}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600",
            "active:scale-95"
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Add To Cart Button Component
 * Untuk WiFi dan Panel, langsung ke checkout tanpa pilih tier
 */
interface AddToCartButtonProps {
  product: Product;
  selectedTier: string;
  totalPrice: number;
  isDarkMode: boolean;
}

function AddToCartButton({ 
  product, 
  selectedTier, 
  totalPrice, 
  isDarkMode,
}: AddToCartButtonProps) {
  const navigate = useNavigate();
  const { addToCart } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isWiFi = isWiFiProduct(product);
  const isPanel = isPanelProduct(product);
  const needsForm = isWiFi || isPanel;

  const handleAddToCart = useCallback(() => {
    // For WiFi and Panel, skip tier selection (done in checkout)
    if (!needsForm && !selectedTier) {
      toast.error('Silakan pilih paket terlebih dahulu');
      return;
    }

    setIsAdding(true);
    audioService.playAddToCart();

    setTimeout(() => {
      addToCart(product, selectedTier || product.tiers[0]?.name || 'Default');
      setIsAdding(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }, 300);
  }, [product, selectedTier, addToCart, needsForm]);

  const handleBuyNow = useCallback(() => {
    // For WiFi and Panel, langsung ke checkout
    if (!needsForm && !selectedTier) {
      toast.error('Silakan pilih paket terlebih dahulu');
      return;
    }
    
    addToCart(product, selectedTier || product.tiers[0]?.name || 'Default');
    navigate('/checkout');
  }, [product, selectedTier, addToCart, navigate, needsForm]);

  if (showSuccess) {
    return (
      <div className={cn(
        "w-full h-14 rounded-xl flex items-center justify-center font-semibold",
        "bg-green-500 text-white animate-in fade-in"
      )}>
        <Check className="h-5 w-5 mr-2" />
        Berhasil Ditambahkan!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          className={cn(
            "flex-1 h-14 text-base font-semibold transition-all duration-200",
            "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600",
            "shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
          )}
          onClick={handleAddToCart}
          disabled={isAdding || (!needsForm && !selectedTier)}
        >
          {isAdding ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <ShoppingCart className="h-5 w-5 mr-2" />
          )}
          Tambah ke Keranjang
        </Button>

        <Button
          size="lg"
          className={cn(
            "flex-1 h-14 text-base font-semibold transition-all duration-200",
            "bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500",
            "shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
          )}
          onClick={handleBuyNow}
          disabled={!needsForm && !selectedTier}
        >
          <Zap className="h-5 w-5 mr-2" />
          Beli Sekarang
        </Button>
      </div>
      
      <div className={cn(
        "text-center text-sm",
        isDarkMode ? "text-gray-400" : "text-gray-500"
      )}>
        Total: <span className="font-bold text-blue-600">{formatPrice(totalPrice)}</span>
      </div>
    </div>
  );
}

/**
 * Product Description Component
 */
function ProductDescription({ product, isDarkMode }: { product: Product; isDarkMode: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className={cn(
        "font-semibold flex items-center gap-2",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        <Info className="h-4 w-4 text-blue-500" />
        Deskripsi Produk
      </h3>
      
      <p className={cn(
        "text-sm leading-relaxed",
        isDarkMode ? "text-gray-300" : "text-gray-600"
      )}>
        {product.description}
      </p>

      <div className="flex flex-wrap gap-2 pt-2">
        {product.tags.map((tag) => (
          <Badge 
            key={tag} 
            variant="outline"
            className={cn(
              "text-xs",
              isDarkMode && "border-gray-700 text-gray-300"
            )}
          >
            #{tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/**
 * Trust Badges Component
 */
function TrustBadges({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-xl",
      isDarkMode ? "bg-gray-800" : "bg-gray-50"
    )}>
      <h3 className={cn(
        "font-semibold mb-3",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        Keunggulan Kami
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {TRUST_BADGES.map((badge) => (
          <div key={badge.label} className="flex items-start gap-2">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
              isDarkMode ? "bg-blue-900/30" : "bg-blue-100"
            )}>
              <badge.icon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <span className={cn(
                "text-xs font-medium block",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>
                {badge.label}
              </span>
              <span className={cn(
                "text-[10px] block",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                {badge.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Related Products Component
 */
function RelatedProducts({ 
  currentProduct, 
  isDarkMode 
}: { 
  currentProduct: Product; 
  isDarkMode: boolean;
}) {
  const { products } = useProducts();
  const navigate = useNavigate();

  const relatedProducts = useMemo(() => {
    return products
      .filter(p => 
        p.id !== currentProduct.id && 
        (p.category === currentProduct.category || p.tags.some(t => currentProduct.tags.includes(t)))
      )
      .slice(0, 4);
  }, [products, currentProduct]);

  if (relatedProducts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className={cn(
        "font-semibold flex items-center gap-2",
        isDarkMode ? "text-white" : "text-gray-900"
      )}>
        <LayoutGrid className="h-4 w-4 text-blue-500" />
        Produk Terkait
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {relatedProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => navigate(`/product/${product.id}`)}
            className={cn(
              "text-left p-3 rounded-xl border transition-all",
              "hover:shadow-md active:scale-95",
              isDarkMode 
                ? "border-gray-700 bg-gray-800 hover:border-gray-600" 
                : "border-gray-200 bg-white hover:border-blue-300"
            )}
          >
            <img
              src={product.icon}
              alt={product.title}
              className="w-full aspect-square object-cover rounded-lg mb-2"
              loading="lazy"
            />
            <h4 className={cn(
              "font-medium text-sm line-clamp-1",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              {product.title}
            </h4>
            <p className="text-blue-600 font-bold text-sm mt-1">
              {formatPrice(product.discount_price || product.base_price)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * WiFi Info Card - Menampilkan info bahwa pilih paket di checkout
 */
function WiFiInfoCard({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2",
      isDarkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
          isDarkMode ? "bg-blue-900/50" : "bg-blue-100"
        )}>
          <Wifi className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className={cn(
            "font-semibold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Pemasangan WiFi Profesional
          </h3>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? "text-gray-400" : "text-gray-600"
          )}>
            Pilih paket WiFi dan lengkapi data pemasangan di halaman checkout.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel Info Card - Menampilkan info bahwa pilih paket dan isi form di checkout
 */
function PanelInfoCard({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2",
      isDarkMode ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
          isDarkMode ? "bg-purple-900/50" : "bg-purple-100"
        )}>
          <Server className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className={cn(
            "font-semibold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Panel Pterodactyl Game Server
          </h3>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? "text-gray-400" : "text-gray-600"
          )}>
            Pilih paket dan buat akun panel (username & password) di halaman checkout.
          </p>
        </div>
      </div>
      <div className={cn(
        "mt-3 p-3 rounded-lg text-sm",
        isDarkMode ? "bg-gray-800/50" : "bg-white"
      )}>
        <p className={cn(
          "font-medium mb-2",
          isDarkMode ? "text-purple-400" : "text-purple-700"
        )}>
          Support Game:
        </p>
        <div className="flex flex-wrap gap-2">
          {['Minecraft', 'CS:GO', 'Valorant', 'GTA V', 'ARK', 'Rust'].map((game) => (
            <span 
              key={game}
              className={cn(
                "px-2 py-1 rounded text-xs",
                isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
              )}
            >
              {game}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProductSection() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { addRecentlyViewed, isDarkMode } = useAppStore();
  
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Find product
  const product = useMemo(() => {
    return products.find(p => p.id === productId) || null;
  }, [products, productId]);

  const isWiFi = useMemo(() => product ? isWiFiProduct(product) : false, [product]);
  const isPanel = useMemo(() => product ? isPanelProduct(product) : false, [product]);
  const needsForm = isWiFi || isPanel;

  // Set default tier when product loaded
  useEffect(() => {
    if (product && !isWiFi && !isPanel) {
      setSelectedTier(product.tiers[0]?.name || '');
      addRecentlyViewed(product.id);
    }
  }, [product?.id, addRecentlyViewed, isWiFi, isPanel]);

  // Handle product not found
  useEffect(() => {
    if (!isLoadingProducts && !product) {
      toast.error('Produk tidak ditemukan');
      navigate('/');
    }
  }, [isLoadingProducts, product, navigate]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    const tier = product?.tiers.find(t => t.name === selectedTier);
    return (tier?.price || product?.base_price || 0) * quantity;
  }, [product, selectedTier, quantity]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!product) return;
    
    setIsSharing(true);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Lihat ${product.title} di Layanan Digital!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link disalin ke clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  }, [product]);

  // Loading state
  if (isLoadingProducts || !product) {
    return (
      <div className={cn(
        "min-h-screen pb-20",
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      )}>
        <div className={cn(
          "sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b",
          isDarkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-100"
        )}>
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        
        <div className="p-4 space-y-4">
          <Skeleton className="w-full aspect-square rounded-2xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen pb-24",
      isDarkMode ? "bg-gray-900" : "bg-gray-50"
    )}>
      {/* Sticky Header */}
      <header className={cn(
        "sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b backdrop-blur-md",
        isDarkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-100"
      )}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className={cn(
            "font-semibold truncate max-w-[200px]",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Detail Produk
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isWishlisted 
                ? "bg-red-500 text-white" 
                : isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700" 
                  : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        <ProductImageGallery product={product} isDarkMode={isDarkMode} />
        <ProductInfo product={product} isDarkMode={isDarkMode} />

        <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />

        {/* Show TierSelector only for products that don't need form */}
        {!needsForm && (
          <>
            <TierSelector 
              product={product}
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              isDarkMode={isDarkMode}
            />
            <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />
          </>
        )}

        {/* Show info cards for WiFi and Panel */}
        {isWiFi && (
          <>
            <WiFiInfoCard isDarkMode={isDarkMode} />
            <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />
          </>
        )}

        {isPanel && (
          <>
            <PanelInfoCard isDarkMode={isDarkMode} />
            <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />
          </>
        )}

        <QuantitySelector 
          quantity={quantity}
          onChange={setQuantity}
          isDarkMode={isDarkMode}
        />

        <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />

        <ProductDescription product={product} isDarkMode={isDarkMode} />

        <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />

        <TrustBadges isDarkMode={isDarkMode} />

        <Separator className={isDarkMode ? "bg-gray-800" : "bg-gray-200"} />

        <RelatedProducts currentProduct={product} isDarkMode={isDarkMode} />
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 p-4 border-t safe-area-pb",
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      )}>
        <AddToCartButton 
          product={product}
          selectedTier={selectedTier}
          totalPrice={totalPrice}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}
