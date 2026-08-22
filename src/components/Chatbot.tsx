import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Send, Bot, User, 
  ShoppingBag, Wifi, Camera, Code, Server,
  Loader2, RefreshCw, Copy, Sparkles, Zap,
  ChevronRight, CheckCircle2, Minimize2, Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import { sendMessage, type ChatMessage as AIMessage, AIChatbotConfig } from '@/lib/ai-chatbot';
import type { Product } from '@/lib/db';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: Product[];
  isTyping?: boolean;
  action?: 'show_products' | 'create_order' | 'support' | 'show_wifi_packages' | 'show_panel_info';
}

function ProductCard({ product, onAddToCart }: { 
  product: Product; 
  onAddToCart: (product: Product) => void;
}) {
  const lowestPrice = Math.min(...product.tiers.map(t => t.price));
  
  return (
    <div
      className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary transition-all duration-200 cursor-pointer active:scale-98 shadow-sm"
      onClick={() => onAddToCart(product)}
    >
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
        <img
          src={product.icon}
          alt={product.title}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 bg-muted"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-xs sm:text-sm truncate text-primary">
            {product.title}
          </h4>
          <p className="text-[10px] sm:text-xs line-clamp-1 sm:line-clamp-2 mt-0.5 text-muted-foreground">
            {product.description}
          </p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <span className="text-primary font-bold text-xs sm:text-sm">
              Rp {lowestPrice.toLocaleString('id-ID')}
            </span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 bg-background text-primary border border-border">
              {product.tiers.length} paket
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ 
  icon: Icon, 
  label, 
  onClick, 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 flex-shrink-0 bg-background border border-border text-primary hover:bg-muted"
    >
      <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-muted w-fit">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function AIStatusBadge() {
  const hasApiKey = AIChatbotConfig.hasApiKey;
  
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-accent text-primary">
      <div className={cn(
        "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
        hasApiKey ? "bg-primary animate-pulse" : "bg-muted-foreground"
      )} />
      <span className="hidden sm:inline">{hasApiKey ? 'AI Aktif' : 'AI Fallback'}</span>
      <span className="sm:hidden">{hasApiKey ? 'AI' : 'FB'}</span>
    </div>
  );
}

export function Chatbot() {
  const { addToCart } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 **Halo! Selamat datang di Layanan Digital!**\n\nSaya asisten AI yang siap membantu Anda. Kami memiliki **9 layanan profesional** untuk kebutuhan digital Anda.\n\n💬 **Coba tanyakan:**\n• "Info WiFi" atau "Paket Panel"\n• "Harga semua layanan"\n• "Layanan apa saja?"\n• "Mau pesan CCTV"\n\nAda yang bisa saya bantu? 😊',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen && messages.length === 1) {
      const timer = setTimeout(() => {
        setHasNewMessage(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    audioService.playClick();

    const typingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { 
      id: typingId, 
      role: 'assistant', 
      content: '', 
      timestamp: new Date(),
      isTyping: true 
    }]);

    try {
      const response = await sendMessage(userMessage.content, aiHistory);
      
      setAiHistory(prev => ([
        ...prev,
        { role: 'user' as const, content: userMessage.content },
        { role: 'assistant' as const, content: response.text },
      ]).slice(-10));

      setMessages(prev => prev.filter(m => m.id !== typingId));
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        products: response.products,
        action: response.action,
      };

      setMessages(prev => [...prev, assistantMessage]);
      audioService.playSuccess();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, aiHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, product.tiers[0]?.name || '');
    toast.success(`${product.title} ditambahkan!`);
    audioService.playAddToCart();
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '👋 **Halo! Selamat datang di Layanan Digital!**\n\nSaya asisten AI yang siap membantu Anda. Kami memiliki **9 layanan profesional** untuk kebutuhan digital Anda.\n\n💬 **Coba tanyakan:**\n• "Info WiFi" atau "Paket Panel"\n• "Harga semua layanan"\n• "Layanan apa saja?"\n• "Mau pesan CCTV"\n\nAda yang bisa saya bantu? 😊',
      timestamp: new Date(),
    }]);
    setAiHistory([]);
    audioService.playClick();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Pesan disalin!');
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setHasNewMessage(false);
    }
    audioService.playClick();
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={toggleChat}
        className={cn(
          "fixed z-50 rounded-full shadow-soft-lg flex items-center justify-center transition-all duration-300 active:scale-95",
          "w-12 h-12 sm:w-14 sm:h-14",
          isMobile ? "bottom-16 right-3" : "bottom-20 right-4",
          isOpen 
            ? "bg-secondary text-primary-foreground rotate-90" 
            : "bg-primary hover:bg-secondary text-primary-foreground"
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <div className="relative">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-primary" />
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      <div
        ref={chatContainerRef}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out border border-border bg-card shadow-soft-lg",
          isMobile 
            ? "inset-x-0 bottom-0 rounded-t-2xl"
            : "bottom-24 right-4 w-[380px] lg:w-[420px] rounded-2xl",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-8 pointer-events-none"
        )}
        style={{
          height: isOpen 
            ? isMobile 
              ? isMinimized ? '60px' : 'calc(100vh - 80px)'
              : isMinimized ? '60px' : 'min(600px, calc(100vh - 120px))'
            : '0',
          maxHeight: isMobile ? 'calc(100vh - 80px)' : '600px',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between select-none bg-primary text-primary-foreground border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/10">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded-full border-2 border-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-primary-foreground text-sm sm:text-base truncate">AI Assistant</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="text-[10px] sm:text-xs text-primary-foreground/70 truncate">Powered by Kimi AI</p>
                <AIStatusBadge />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
              )}
            </button>
            <button
              onClick={clearChat}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          isMinimized ? "opacity-0 h-0" : "opacity-100"
        )}>
          {/* Messages Area */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start",
                    "animate-in fade-in duration-200"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-muted text-primary border border-border">
                      <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  )}

                  <div className={cn("max-w-[75%] sm:max-w-[80%]", message.role === 'user' && "order-first")}>
                    {message.isTyping ? (
                      <TypingIndicator />
                    ) : (
                      <>
                        <div
                          className={cn(
                            "px-3 sm:px-4 py-2 sm:py-3 rounded-2xl relative group text-xs sm:text-sm leading-relaxed",
                            message.role === 'user'
                              ? "bg-primary text-primary-foreground rounded-br-md font-medium"
                              : "bg-muted text-foreground rounded-bl-md border border-border"
                          )}
                        >
                          <p className="whitespace-pre-wrap">
                            {message.role === 'assistant' 
                              ? parseBoldText(message.content)
                              : message.content
                            }
                          </p>
                          
                          {message.role === 'assistant' && (
                            <button
                              onClick={() => copyMessage(message.content)}
                              className="absolute -right-7 sm:-right-8 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground"
                            >
                              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                          )}
                        </div>

                        <span className={cn(
                          "text-[10px] sm:text-xs mt-1 block text-muted-foreground",
                          message.role === 'user' ? "text-right" : "text-left"
                        )}>
                          {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {message.action === 'create_order' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/cart'}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors"
                            >
                              <ShoppingBag className="h-3 w-3" />
                              Keranjang
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {message.action === 'show_wifi_packages' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/product/wifi'}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors"
                            >
                              <Wifi className="h-3 w-3" />
                              Paket WiFi
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {message.action === 'show_panel_info' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/product/panel'}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-secondary transition-colors"
                            >
                              <Server className="h-3 w-3" />
                              Panel
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {message.products && message.products.length > 0 && (
                          <div className="mt-2 sm:mt-3 space-y-2">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                              Produk yang mungkin Anda cari:
                            </p>
                            {message.products.slice(0, 3).map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleAddToCart}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground font-semibold">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="flex-shrink-0 px-3 sm:px-4 py-2 border-t border-border bg-background">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1.5 sm:gap-2 pb-1">
                <QuickAction
                  icon={ShoppingBag}
                  label="Produk"
                  onClick={() => handleQuickAction('Tampilkan semua produk')}
                />
                <QuickAction
                  icon={Wifi}
                  label="WiFi"
                  onClick={() => handleQuickAction('Info paket WiFi')}
                />
                <QuickAction
                  icon={Server}
                  label="Panel"
                  onClick={() => handleQuickAction('Info Panel Pterodactyl')}
                />
                <QuickAction
                  icon={Camera}
                  label="CCTV"
                  onClick={() => handleQuickAction('Info CCTV')}
                />
                <QuickAction
                  icon={Code}
                  label="Website"
                  onClick={() => handleQuickAction('Jasa website development')}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                className="flex-1 text-sm bg-background border-border h-10 sm:h-11 focus:ring-primary"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "px-3 sm:px-4 transition-colors h-10 sm:h-11",
                  input.trim() && !isLoading
                    ? "bg-primary hover:bg-secondary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs mt-2 text-muted-foreground">
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
              <span>Powered by Kimi AI</span>
              {AIChatbotConfig.hasApiKey && (
                <>
                  <span className="mx-1">•</span>
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-primary/40 z-40 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default Chatbot;
