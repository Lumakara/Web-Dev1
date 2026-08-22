import { useState, useEffect, useCallback, memo } from 'react';
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
import type { Product } from '@/lib/db';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, tierName: string, quantity?: number) => void;
  isInCart: (productId: string, tierName: string) => boolean;
  getCartQuantity: (productId: string, tierName: string) => number;
  isDarkMode?: boolean;
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

  useEffect(() => {
    if (product) {
      setSelectedTier(product.tiers[0]?.name || '');
      setSelectedSubcategory('');
      setQuantity(1);
      setActiveImageIndex(0);
      setActiveTab('overview');
      setExpandedFeatures(false);
    }
  }, [product?.id]);

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

  if (!product) return null;

  const selectedTierData = product.tiers.find(t => t.name === selectedTier);
  const ProductIcon = getProductIcon(product.category);
  const subcategories = PRODUCT_SUBCATEGORIES[product.id] || [];
  const hasSubcategories = subcategories.length > 0;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.discount_price || 0)) / product.base_price) * 100)
    : 0;

  const galleryImages = [
    product.image,
    product.icon,
    `https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800`,
    `https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800`,
  ].filter(Boolean);

  const totalPrice = (selectedTierData?.price || 0) * quantity;

  // MOBILE VIEW
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="h-[95vh] p-0 border-0 rounded-t-3xl bg-card"
        >
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
          
          {/* Header */}
          <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-border bg-card">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-primary">Detail Produk</span>
            <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-foreground">
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="h-[calc(95vh-140px)]">
            <div className="pb-32">
              {/* Image */}
              <div className="aspect-[4/3] relative bg-muted">
                <img
                  src={galleryImages[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 inline mr-1 fill-accent text-accent" />
                    {product.rating}
                  </div>
                  {hasDiscount && (
                    <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent text-primary">
                      -{discountPercent}%
                    </div>
                  )}
                </div>

                {/* Image Navigation */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/70 text-primary-foreground flex items-center justify-center"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev < galleryImages.length - 1 ? prev + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/70 text-primary-foreground flex items-center justify-center"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-muted text-primary border-border">
                      <ProductIcon className="h-3 w-3 mr-1" />
                      {product.category}
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {product.duration}
                    </Badge>
                  </div>
                  <h1 className="text-xl font-bold text-primary">
                    {product.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-sm text-foreground">
                      {product.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">({product.reviews} ulasan)</span>
                  </div>
                </div>

                {/* Price */}
                <div className="p-4 rounded-xl bg-background border border-border">
                  <span className="text-2xl font-bold text-primary">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm line-through ml-2 text-muted-foreground">
                      Rp {product.base_price.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                {/* Subcategories */}
                {hasSubcategories && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-primary">Pilihan Paket</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(sub.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left text-xs transition-colors",
                            selectedSubcategory === sub.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          <span className="font-medium block text-primary">{sub.name}</span>
                          <span className="text-muted-foreground block mt-0.5">{sub.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiers */}
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-primary">Pilih Tier</h4>
                  <div className="space-y-2">
                    {product.tiers.map((tier) => (
                      <button
                        key={tier.name}
                        onClick={() => setSelectedTier(tier.name)}
                        className={cn(
                          "w-full p-3 rounded-xl border text-left relative transition-colors",
                          selectedTier === tier.name
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        )}
                      >
                        {selectedTier === tier.name && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex justify-between items-start pr-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-primary">{tier.name}</span>
                              {isInCart(product.id, tier.name) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-primary font-semibold">
                                  {getCartQuantity(product.id, tier.name)} di keranjang
                                </span>
                              )}
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {tier.features.slice(0, expandedFeatures ? undefined : 2).map((feature, fidx) => (
                                <li key={fidx} className="text-xs text-muted-foreground flex items-center">
                                  <Check className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                                  <span className="line-clamp-1">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-right">
                            <span className="text-primary font-bold text-sm">
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
                  <h4 className="font-semibold mb-2 text-sm text-primary">Jumlah</h4>
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-border bg-background">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-primary">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-primary">Deskripsi</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom Action */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            <Button
              size="lg"
              className="w-full h-12 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors"
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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 gap-0 border-border rounded-2xl bg-card">
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-background border border-border text-foreground hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="grid lg:grid-cols-2 h-[90vh]">
          {/* Left - Image */}
          <div className="relative overflow-hidden bg-background border-r border-border">
            <div className="relative h-full flex items-center justify-center p-8">
              <img
                src={galleryImages[activeImageIndex]}
                alt={product.title}
                className="max-h-full max-w-full object-contain"
                loading="eager"
              />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="px-3 py-1.5 rounded-full text-sm font-bold bg-primary text-primary-foreground flex items-center">
                  <Star className="h-3.5 w-3.5 mr-1 fill-accent text-accent" />
                  {product.rating}
                </div>
                {hasDiscount && (
                  <div className="px-3 py-1.5 rounded-full text-sm font-bold bg-accent text-primary">
                    -{discountPercent}%
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={cn("absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center border border-border shadow-sm transition-colors", 
                  isWishlisted ? "bg-accent text-primary border-accent" : "bg-card text-foreground hover:bg-muted")}
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
                    "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                    activeImageIndex === idx ? "border-primary shadow-sm" : "border-border opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {galleryImages.length > 1 && (
              <>
                <button onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border text-foreground shadow-sm hover:bg-muted">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setActiveImageIndex(prev => prev < galleryImages.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border text-foreground shadow-sm hover:bg-muted">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Right - Details */}
          <div className="flex flex-col h-full bg-card">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-6 pt-6 pb-2 border-b border-border">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-background text-primary border-border">
                      <ProductIcon className="h-3.5 w-3.5 mr-1" />
                      {product.category}
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {product.duration}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-primary">
                    {product.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="font-semibold text-primary">{product.rating}</span>
                      <span className="text-sm text-muted-foreground">({product.reviews} ulasan)</span>
                    </div>
                    <span className="text-border">|</span>
                    <span className="text-sm text-muted-foreground">Terjual {product.reviews * 12}+</span>
                  </div>
                </div>

                <TabsList className="grid w-full grid-cols-3 bg-background border border-border">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
                  <TabsTrigger value="tiers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tier</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detail</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <span className="text-2xl font-bold text-primary">
                        Rp {totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {product.tiers.slice(0, 3).map((tier) => (
                        <button
                          key={tier.name}
                          onClick={() => { setSelectedTier(tier.name); setActiveTab('tiers'); }}
                          className={cn(
                            "p-3 rounded-xl border text-center transition-colors",
                            selectedTier === tier.name ? "border-primary bg-primary/5" : "border-border bg-card"
                          )}
                        >
                          <span className="text-xs font-medium block text-primary">{tier.name}</span>
                          <span className="text-primary font-bold text-sm">Rp {tier.price.toLocaleString('id-ID')}</span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="tiers" className="mt-0 space-y-4">
                    {hasSubcategories && (
                      <div>
                        <h4 className="font-semibold mb-2 text-primary">Pilihan Paket</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubcategory(sub.id)}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-colors",
                                selectedSubcategory === sub.id ? "border-primary bg-primary/5" : "border-border bg-card"
                              )}
                            >
                              <span className="text-sm font-medium block text-primary">{sub.name}</span>
                              <span className="text-xs text-muted-foreground">{sub.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Pilih Tier</h4>
                      <div className="space-y-2">
                        {product.tiers.map((tier) => (
                          <button
                            key={tier.name}
                            onClick={() => setSelectedTier(tier.name)}
                            className={cn(
                              "w-full p-4 rounded-xl border text-left relative transition-colors",
                              selectedTier === tier.name ? "border-primary bg-primary/5" : "border-border bg-card"
                            )}
                          >
                            {selectedTier === tier.name && (
                              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                            <div className="flex justify-between items-start pr-8">
                              <div>
                                <span className="font-semibold block text-primary">{tier.name}</span>
                                <ul className="mt-1 space-y-1">
                                  {tier.features.map((feature, fidx) => (
                                    <li key={fidx} className="text-sm text-muted-foreground flex items-center">
                                      <Check className="h-3.5 w-3.5 text-primary mr-1.5 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <span className="text-primary font-bold text-lg">Rp {tier.price.toLocaleString('id-ID')}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Jumlah</h4>
                      <div className="inline-flex items-center gap-4 px-4 py-2 rounded-xl border border-border bg-background">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-foreground disabled:opacity-40">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg text-primary">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-foreground">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="mt-0 space-y-4">
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Shield, text: 'Garansi 100%' },
                          { icon: Truck, text: 'Instalasi Cepat' },
                          { icon: Headphones, text: 'Support 24/7' },
                          { icon: BadgeCheck, text: 'Teknisi Profesional' },
                        ].map((badge) => (
                          <div key={badge.text} className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <badge.icon className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-primary">{badge.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">Total Harga</span>
                  <span className="text-2xl font-bold block text-primary">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <button onClick={handleShare} className="w-12 h-12 rounded-xl flex items-center justify-center border border-border bg-background text-foreground hover:bg-muted transition-colors">
                  <Share2 className="h-5 w-5" />
                </button>
                <Button
                  size="lg"
                  className="px-8 h-12 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors"
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

        {/* Success Modal Animation Overlay */}
        {showAddedAnimation && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/40 backdrop-blur-xs z-50">
            <div className="rounded-2xl p-8 text-center bg-card border border-border shadow-soft-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-primary">Berhasil Ditambahkan!</h3>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ProductModal;
