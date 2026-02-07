import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  Star, Clock, ShoppingCart, Check, X, ChevronRight, ChevronLeft,
  Share2, Heart, Shield, Sparkles, Minus, Plus,
  Wifi, Code, Palette, Truck, Headphones, BadgeCheck, 
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { audioService } from '@/lib/audio';
import type { Product } from '@/lib/firebase-db';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, tierName: string, quantity?: number) => void;
  isInCart: (productId: string, tierName: string) => boolean;
  getCartQuantity: (productId: string, tierName: string) => number;
  isDarkMode: boolean;
}

// Product subcategories configuration
const PRODUCT_SUBCATEGORIES: Record<string, { id: string; name: string; description: string }[]> = {
  vps: [
    { id: 'nat', name: 'VPS NAT', description: 'VPS dengan IP NAT, hemat biaya' },
    { id: 'public', name: 'VPS Public IP', description: 'VPS dengan IP Public dedicated' },
    { id: 'gaming', name: 'VPS Gaming', description: 'VPS optimized untuk game server' },
    { id: 'storage', name: 'VPS Storage', description: 'VPS dengan storage besar' },
  ],
  wifi: [
    { id: 'flash', name: 'FLASH 60 Mbps', description: 'Up to 60 Mbps - Ideal 6 perangkat' },
    { id: 'light', name: 'LIGHT 100 Mbps', description: 'Up to 100 Mbps - Ideal 8-10 perangkat' },
    { id: 'amazing', name: 'AMAZING 150 Mbps', description: 'Up to 150 Mbps - Ideal 15 perangkat' },
    { id: 'blitz', name: 'BLITZ 300 Mbps', description: 'Up to 300 Mbps - Ideal 20-25 perangkat' },
    { id: 'universe', name: 'UNIVERSE 500 Mbps', description: 'Up to 500 Mbps - High performance' },
    { id: 'infinite', name: 'INFINITE 1 Gbps', description: '1 Gbps - Ultra speed' },
  ],
  cctv: [
    { id: 'home', name: 'Paket Rumah', description: '2-4 Kamera untuk rumah' },
    { id: 'office', name: 'Paket Kantor', description: '4-8 Kamera untuk kantor' },
    { id: 'commercial', name: 'Paket Komersial', description: '8+ Kamera untuk bisnis' },
  ],
};

// Simple mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export const ProductModal = memo(function ProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isInCart,
  getCartQuantity,
  isDarkMode,
}: ProductModalProps) {
  const isMobile = useIsMobile();
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedFeatures, setExpandedFeatures] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedTier(product.tiers[0]?.name || '');
      setSelectedSubcategory('');
      setQuantity(1);
      setActiveImageIndex(0);
      setActiveTab('overview');
      setExpandedFeatures(false);
    }
  }, [product?.id]); // Only reset when product ID changes

  const handleAddToCart = useCallback(() => {
    if (!product || !selectedTier) return;
    
    audioService.playAddToCart();
    onAddToCart(product, selectedTier, quantity);
    setShowAddedAnimation(true);
    
    setTimeout(() => setShowAddedAnimation(false), 1500);
  }, [product, selectedTier, quantity, onAddToCart]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Lihat ${product.title} di Layanan Digital!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [product]);

  const getProductIcon = useCallback((category: string) => {
    switch (category) {
      case 'installation': return Wifi;
      case 'creative': return Palette;
      case 'technical': return Code;
      default: return Sparkles;
    }
  }, []);

  // Early return if no product
  if (!product) return null;

  const selectedTierData = product.tiers.find(t => t.name === selectedTier);
  const ProductIcon = getProductIcon(product.category);
  const subcategories = PRODUCT_SUBCATEGORIES[product.id] || [];
  const hasSubcategories = subcategories.length > 0;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.discount_price || 0)) / product.base_price) * 100)
    : 0;

  const galleryImages = useMemo(() => [
    product.image,
    product.icon,
    `https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800`,
    `https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800`,
  ].filter(Boolean), [product.image, product.icon]);

  const totalPrice = (selectedTierData?.price || 0) * quantity;

  // MOBILE VIEW
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[95vh] p-0 border-0 rounded-t-3xl",
            isDarkMode ? "bg-gray-900" : "bg-white"
          )}
        >
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
          
          {/* Header */}
          <div className={cn(
            "sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b",
            isDarkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-100"
          )}>
            <button 
              onClick={onClose}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
              Detail Produk
            </span>
            <button onClick={handleShare} className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-gray-800" : "bg-gray-100")}>
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="h-[calc(95vh-140px)]">
            <div className="pb-32">
              {/* Image */}
              <div className={cn("aspect-[4/3] relative", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
                <img
                  src={galleryImages[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                    <Star className="h-3 w-3 inline mr-1" />
                    {product.rating}
                  </div>
                  {hasDiscount && (
                    <div className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                      -{discountPercent}%
                    </div>
                  )}
                </div>

                {/* Image Navigation */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev < galleryImages.length - 1 ? prev + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        activeImageIndex === idx ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={isDarkMode ? "bg-gray-800" : ""}>
                      <ProductIcon className="h-3 w-3 mr-1" />
                      {product.category}
                    </Badge>
                    <Badge variant="outline" className={isDarkMode ? "border-gray-700" : ""}>
                      <Clock className="h-3 w-3 mr-1" />
                      {product.duration}
                    </Badge>
                  </div>
                  <h1 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {product.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className={cn("font-semibold text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                      {product.rating}
                    </span>
                    <span className="text-xs text-gray-500">({product.reviews} ulasan)</span>
                  </div>
                </div>

                {/* Price */}
                <div className={cn("p-4 rounded-xl", isDarkMode ? "bg-gray-800" : "bg-blue-50")}>
                  <span className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-blue-700")}>
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm line-through ml-2 text-gray-500">
                      Rp {product.base_price.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                {/* Subcategories */}
                {hasSubcategories && (
                  <div>
                    <h4 className={cn("font-semibold mb-2 text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                      Pilihan Paket
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(sub.id)}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left text-xs",
                            selectedSubcategory === sub.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : isDarkMode ? "border-gray-700" : "border-gray-200"
                          )}
                        >
                          <span className={cn("font-medium block", isDarkMode ? "text-white" : "text-gray-900")}>
                            {sub.name}
                          </span>
                          <span className="text-gray-500 block mt-0.5">{sub.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiers */}
                <div>
                  <h4 className={cn("font-semibold mb-2 text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                    Pilih Tier
                  </h4>
                  <div className="space-y-2">
                    {product.tiers.map((tier) => (
                      <button
                        key={tier.name}
                        onClick={() => setSelectedTier(tier.name)}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 text-left relative",
                          selectedTier === tier.name
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : isDarkMode ? "border-gray-700" : "border-gray-200"
                        )}
                      >
                        {selectedTier === tier.name && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div className="flex justify-between items-start pr-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("font-semibold text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                                {tier.name}
                              </span>
                              {isInCart(product.id, tier.name) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  {getCartQuantity(product.id, tier.name)} di keranjang
                                </span>
                              )}
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {tier.features.slice(0, expandedFeatures ? undefined : 2).map((feature, fidx) => (
                                <li key={fidx} className="text-xs text-gray-500 flex items-center">
                                  <Check className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                                  <span className="line-clamp-1">{feature}</span>
                                </li>
                              ))}
                            </ul>
                            {tier.features.length > 2 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedFeatures(!expandedFeatures); }}
                                className="text-xs text-blue-500 mt-1"
                              >
                                {expandedFeatures ? 'Sembunyikan' : `+${tier.features.length - 2} fitur`}
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-blue-600 font-bold text-sm">
                              Rp {tier.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <h4 className={cn("font-semibold mb-2 text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                    Jumlah
                  </h4>
                  <div className={cn("inline-flex items-center gap-3 px-4 py-2 rounded-xl border", isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200")}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className={cn("w-8 text-center font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className={cn("font-semibold mb-2 text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                    Deskripsi
                  </h4>
                  <p className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                    {product.description}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom Action */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-4 border-t",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
          )}>
            <Button
              size="lg"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
              onClick={handleAddToCart}
              disabled={!selectedTier || showAddedAnimation}
            >
              {showAddedAnimation ? (
                <><Check className="h-5 w-5 mr-2" /> Ditambahkan!</>
              ) : (
                <><ShoppingCart className="h-5 w-5 mr-2" /> Tambah • Rp {totalPrice.toLocaleString('id-ID')}</>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // DESKTOP VIEW
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 gap-0 border-0 rounded-2xl",
          isDarkMode ? "bg-gray-900" : "bg-white"
        )}
      >
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        
        <button onClick={onClose} className={cn("absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-gray-800 text-white" : "bg-white shadow-lg")}>
          <X className="h-5 w-5" />
        </button>

        <div className="grid lg:grid-cols-2 h-[90vh]">
          {/* Left - Image */}
          <div className={cn("relative overflow-hidden", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
            <div className="relative h-full flex items-center justify-center p-8">
              <img
                src={galleryImages[activeImageIndex]}
                alt={product.title}
                className="max-h-full max-w-full object-contain"
                loading="eager"
              />
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="px-3 py-1.5 rounded-full text-sm font-bold bg-blue-500 text-white">
                  <Star className="h-3.5 w-3.5 inline mr-1" />
                  {product.rating}
                </div>
                {hasDiscount && (
                  <div className="px-3 py-1.5 rounded-full text-sm font-bold bg-red-500 text-white">
                    -{discountPercent}%
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={cn("absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg", 
                  isWishlisted ? "bg-red-500 text-white" : isDarkMode ? "bg-gray-700 text-white" : "bg-white")}
              >
                <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={cn(
                    "w-14 h-14 rounded-lg overflow-hidden border-2",
                    activeImageIndex === idx ? "border-blue-500" : isDarkMode ? "border-gray-600" : "border-white"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {/* Nav arrows */}
            {galleryImages.length > 1 && (
              <>
                <button onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)} 
                  className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-gray-700 text-white" : "bg-white shadow-lg")}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setActiveImageIndex(prev => prev < galleryImages.length - 1 ? prev + 1 : 0)}
                  className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-gray-700 text-white" : "bg-white shadow-lg")}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Right - Details */}
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className={cn("px-6 pt-6 pb-2 border-b", isDarkMode ? "border-gray-800" : "border-gray-100")}>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={isDarkMode ? "bg-gray-800" : ""}>
                      <ProductIcon className="h-3 w-3 mr-1" />
                      {product.category}
                    </Badge>
                    <Badge variant="outline" className={isDarkMode ? "border-gray-700" : ""}>
                      <Clock className="h-3 w-3 mr-1" />
                      {product.duration}
                    </Badge>
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {product.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>{product.rating}</span>
                      <span className="text-sm text-gray-500">({product.reviews} ulasan)</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">Terjual {product.reviews * 12}+</span>
                  </div>
                </div>

                <TabsList className={cn("grid w-full grid-cols-3", isDarkMode ? "bg-gray-800" : "bg-gray-100")}>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tiers">Tier</TabsTrigger>
                  <TabsTrigger value="details">Detail</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <div className={cn("p-4 rounded-xl", isDarkMode ? "bg-gray-800" : "bg-blue-50")}>
                      <span className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-blue-700")}>
                        Rp {totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                      {product.description}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {product.tiers.slice(0, 3).map((tier) => (
                        <button
                          key={tier.name}
                          onClick={() => { setSelectedTier(tier.name); setActiveTab('tiers'); }}
                          className={cn(
                            "p-3 rounded-xl border-2 text-center",
                            selectedTier === tier.name ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : isDarkMode ? "border-gray-700" : "border-gray-200"
                          )}
                        >
                          <span className={cn("text-xs font-medium block", isDarkMode ? "text-white" : "text-gray-900")}>{tier.name}</span>
                          <span className="text-blue-600 font-bold text-sm">Rp {tier.price.toLocaleString('id-ID')}</span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="tiers" className="mt-0 space-y-4">
                    {hasSubcategories && (
                      <div>
                        <h4 className={cn("font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>Pilihan Paket</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubcategory(sub.id)}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left",
                                selectedSubcategory === sub.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : isDarkMode ? "border-gray-700" : "border-gray-200"
                              )}
                            >
                              <span className={cn("text-sm font-medium block", isDarkMode ? "text-white" : "text-gray-900")}>{sub.name}</span>
                              <span className="text-xs text-gray-500">{sub.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className={cn("font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>Pilih Tier</h4>
                      <div className="space-y-2">
                        {product.tiers.map((tier) => (
                          <button
                            key={tier.name}
                            onClick={() => setSelectedTier(tier.name)}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 text-left relative",
                              selectedTier === tier.name ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : isDarkMode ? "border-gray-700" : "border-gray-200"
                            )}
                          >
                            {selectedTier === tier.name && (
                              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div className="flex justify-between items-start pr-8">
                              <div>
                                <span className={cn("font-semibold block", isDarkMode ? "text-white" : "text-gray-900")}>{tier.name}</span>
                                <ul className="mt-1 space-y-1">
                                  {tier.features.map((feature, fidx) => (
                                    <li key={fidx} className="text-sm text-gray-500 flex items-center">
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <span className="text-blue-600 font-bold text-lg">Rp {tier.price.toLocaleString('id-ID')}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className={cn("font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>Jumlah</h4>
                      <div className={cn("inline-flex items-center gap-4 px-4 py-2 rounded-xl border", isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200")}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center disabled:opacity-50">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className={cn("w-12 text-center font-bold text-lg", isDarkMode ? "text-white" : "text-gray-900")}>{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="mt-0 space-y-4">
                    <div className={cn("p-4 rounded-xl", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Shield, text: 'Garansi 100%' },
                          { icon: Truck, text: 'Instalasi Cepat' },
                          { icon: Headphones, text: 'Support 24/7' },
                          { icon: BadgeCheck, text: 'Teknisi Profesional' },
                        ].map((badge) => (
                          <div key={badge.text} className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <badge.icon className="h-5 w-5 text-green-600" />
                            </div>
                            <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-gray-900")}>{badge.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            {/* Bottom Actions */}
            <div className={cn("p-6 border-t", isDarkMode ? "border-gray-800" : "border-gray-100")}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-sm text-gray-500">Total Harga</span>
                  <span className={cn("text-2xl font-bold block", isDarkMode ? "text-white" : "text-gray-900")}>
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <button onClick={handleShare} className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isDarkMode ? "bg-gray-800" : "bg-gray-100")}>
                  <Share2 className="h-5 w-5" />
                </button>
                <Button
                  size="lg"
                  className="px-8 h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                  onClick={handleAddToCart}
                  disabled={!selectedTier || showAddedAnimation}
                >
                  {showAddedAnimation ? (
                    <><Check className="h-5 w-5 mr-2" /> Ditambahkan!</>
                  ) : (
                    <><ShoppingCart className="h-5 w-5 mr-2" /> Tambah ke Keranjang</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Animation */}
        {showAddedAnimation && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className={cn("rounded-2xl p-8 text-center", isDarkMode ? "bg-gray-800" : "bg-white")}>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h3 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>Berhasil!</h3>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ProductModal;
