/**
 * ULTRA RESPONSIVE CHATBOT
 * Fully optimized for mobile devices with smooth animations
 */

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
import type { Product } from '@/lib/firebase-db';
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

// Product Card Component - Ultra Responsive
function ProductCard({ product, onAddToCart, isDarkMode }: { 
  product: Product; 
  onAddToCart: (product: Product) => void;
  isDarkMode: boolean;
}) {
  const lowestPrice = Math.min(...product.tiers.map(t => t.price));
  
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-95",
        isDarkMode 
          ? "bg-gray-800 border-gray-700 hover:border-blue-500" 
          : "bg-white border-gray-200 hover:border-blue-400 shadow-sm"
      )}
      onClick={() => onAddToCart(product)}
    >
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
        <img
          src={product.icon}
          alt={product.title}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-xs sm:text-sm truncate",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            {product.title}
          </h4>
          <p className={cn(
            "text-[10px] sm:text-xs line-clamp-1 sm:line-clamp-2 mt-0.5",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            {product.description}
          </p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <span className="text-blue-600 font-bold text-xs sm:text-sm">
              Rp {lowestPrice.toLocaleString('id-ID')}
            </span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
              {product.tiers.length} paket
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Action Button - Mobile Optimized
function QuickAction({ 
  icon: Icon, 
  label, 
  onClick, 
  isDarkMode,
  color = 'default'
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  isDarkMode: boolean;
  color?: 'default' | 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colorClasses = {
    default: isDarkMode
      ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    blue: isDarkMode
      ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
      : "bg-blue-50 text-blue-700 hover:bg-blue-100",
    purple: isDarkMode
      ? "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
      : "bg-purple-50 text-purple-700 hover:bg-purple-100",
    green: isDarkMode
      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
      : "bg-green-50 text-green-700 hover:bg-green-100",
    orange: isDarkMode
      ? "bg-orange-900/30 text-orange-400 hover:bg-orange-900/50"
      : "bg-orange-50 text-orange-700 hover:bg-orange-100",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium",
        "transition-all duration-200 active:scale-95 flex-shrink-0",
        colorClasses[color]
      )}
    >
      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

// Typing Indicator
function TypingIndicator({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl",
      isDarkMode ? "bg-gray-800" : "bg-gray-100",
      "w-fit"
    )}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce",
              isDarkMode ? "bg-blue-400" : "bg-blue-500"
            )}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// AI Status Badge
function AIStatusBadge({ isDarkMode }: { isDarkMode: boolean }) {
  const hasApiKey = AIChatbotConfig.hasApiKey;
  
  return (
    <div className={cn(
      "flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium",
      hasApiKey
        ? isDarkMode
          ? "bg-green-900/30 text-green-400"
          : "bg-green-100 text-green-700"
        : isDarkMode
          ? "bg-yellow-900/30 text-yellow-400"
          : "bg-yellow-100 text-yellow-700"
    )}>
      <div className={cn(
        "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
        hasApiKey ? "bg-green-500 animate-pulse" : "bg-yellow-500"
      )} />
      <span className="hidden sm:inline">{hasApiKey ? 'AI Aktif' : 'AI Fallback'}</span>
      <span className="sm:hidden">{hasApiKey ? 'AI' : 'FB'}</span>
    </div>
  );
}

/* 
// Floating particles animation - Reserved for future use
function FloatingParticles({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full opacity-20 animate-pulse",
            isDarkMode ? "bg-blue-400" : "bg-blue-500"
          )}
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${2 + i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
*/

export function Chatbot() {
  const { isDarkMode, addToCart } = useAppStore();
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

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when chat is open on mobile
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

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Welcome message animation
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

    // Add typing indicator
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
    } catch (error) {
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

  // Toggle chat with animation
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
      {/* Chat Toggle Button - Mobile Optimized Position */}
      <button
        onClick={toggleChat}
        className={cn(
          "fixed z-50 rounded-full shadow-2xl flex items-center justify-center",
          "transition-all duration-300 active:scale-90",
          "w-12 h-12 sm:w-14 sm:h-14",
          isMobile ? "bottom-16 right-3" : "bottom-20 right-4",
          isOpen 
            ? "bg-red-500 hover:bg-red-600 rotate-90" 
            : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 hover:scale-110"
        )}
        style={{
          boxShadow: isOpen 
            ? '0 10px 40px -10px rgba(239, 68, 68, 0.5)' 
            : '0 10px 40px -10px rgba(124, 58, 237, 0.5)',
        }}
      >
        {isOpen ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        ) : (
          <div className="relative">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
            )}
          </div>
        )}
      </button>

      {/* Chat Window - Ultra Responsive */}
      <div
        ref={chatContainerRef}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out",
          isMobile 
            ? "inset-x-0 bottom-0 rounded-t-2xl"
            : "bottom-24 right-4 w-[380px] lg:w-[420px] rounded-2xl",
          isDarkMode ? "bg-gray-900" : "bg-white",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-8 pointer-events-none"
        )}
        style={{
          height: isOpen 
            ? isMobile 
              ? isMinimized ? '60px' : 'calc(100vh - 80px)'
              : isMinimized ? '60px' : 'min(600px, calc(100vh - 120px))'
            : isMobile ? '0' : '0',
          maxHeight: isMobile ? 'calc(100vh - 80px)' : '600px',
          boxShadow: isDarkMode 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Header - Sticky */}
        <div className={cn(
          "flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between select-none",
          isDarkMode 
            ? "bg-gradient-to-r from-gray-800 to-gray-900" 
            : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        )}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className={cn(
                "rounded-full flex items-center justify-center",
                isDarkMode ? "bg-gray-700" : "bg-white/20",
                "w-8 h-8 sm:w-10 sm:h-10"
              )}>
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm sm:text-base truncate">AI Assistant</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="text-[10px] sm:text-xs text-white/70 truncate">Powered by Kimi AI</p>
                <AIStatusBadge isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/20 transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              )}
            </button>
            <button
              onClick={clearChat}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
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
                    "animate-in fade-in slide-in-from-bottom-2 duration-300"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "rounded-full flex-shrink-0 flex items-center justify-center flex-shrink-0",
                      isDarkMode ? "bg-gray-800" : "bg-blue-100",
                      "w-7 h-7 sm:w-8 sm:h-8"
                    )}>
                      <Bot className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                    </div>
                  )}

                  <div className={cn("max-w-[75%] sm:max-w-[80%]", message.role === 'user' && "order-first")}>
                    {message.isTyping ? (
                      <TypingIndicator isDarkMode={isDarkMode} />
                    ) : (
                      <>
                        <div
                          className={cn(
                            "px-3 sm:px-4 py-2 sm:py-3 rounded-2xl relative group",
                            message.role === 'user'
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md"
                              : isDarkMode
                                ? "bg-gray-800 text-gray-100 rounded-bl-md"
                                : "bg-gray-100 text-gray-800 rounded-bl-md"
                          )}
                        >
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {message.role === 'assistant' 
                              ? parseBoldText(message.content)
                              : message.content
                            }
                          </p>
                          
                          {/* Copy button */}
                          {message.role === 'assistant' && (
                            <button
                              onClick={() => copyMessage(message.content)}
                              className="absolute -right-7 sm:-right-8 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-500" />
                            </button>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className={cn(
                          "text-[10px] sm:text-xs mt-1 block",
                          isDarkMode ? "text-gray-500" : "text-gray-400",
                          message.role === 'user' ? "text-right" : "text-left"
                        )}>
                          {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {/* Action Buttons */}
                        {message.action === 'create_order' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/cart'}
                              className={cn(
                                "flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium",
                                isDarkMode 
                                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                              )}
                            >
                              <ShoppingBag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Keranjang
                              <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        )}

                        {message.action === 'show_wifi_packages' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/product/wifi'}
                              className={cn(
                                "flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium",
                                isDarkMode 
                                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                              )}
                            >
                              <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Paket WiFi
                              <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        )}

                        {message.action === 'show_panel_info' && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.location.href = '/product/panel'}
                              className={cn(
                                "flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium",
                                isDarkMode 
                                  ? "bg-purple-600 text-white hover:bg-purple-700" 
                                  : "bg-purple-500 text-white hover:bg-purple-600"
                              )}
                            >
                              <Server className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Panel
                              <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        )}

                        {/* Product Cards */}
                        {message.products && message.products.length > 0 && (
                          <div className="mt-2 sm:mt-3 space-y-2">
                            <p className={cn(
                              "text-[10px] sm:text-xs font-medium",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                              Produk yang mungkin Anda cari:
                            </p>
                            {message.products.slice(0, 3).map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleAddToCart}
                                isDarkMode={isDarkMode}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className={cn(
                      "rounded-full flex-shrink-0 flex items-center justify-center flex-shrink-0",
                      isDarkMode ? "bg-gray-700" : "bg-blue-600",
                      "w-7 h-7 sm:w-8 sm:h-8"
                    )}>
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Actions - Horizontal Scroll */}
          <div className={cn(
            "flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 border-t",
            isDarkMode ? "border-gray-800 bg-gray-900/50" : "border-gray-100 bg-gray-50"
          )}>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1.5 sm:gap-2 pb-1">
                <QuickAction
                  icon={ShoppingBag}
                  label="Produk"
                  onClick={() => handleQuickAction('Tampilkan semua produk')}
                  isDarkMode={isDarkMode}
                  color="blue"
                />
                <QuickAction
                  icon={Wifi}
                  label="WiFi"
                  onClick={() => handleQuickAction('Info paket WiFi')}
                  isDarkMode={isDarkMode}
                  color="blue"
                />
                <QuickAction
                  icon={Server}
                  label="Panel"
                  onClick={() => handleQuickAction('Info Panel Pterodactyl')}
                  isDarkMode={isDarkMode}
                  color="purple"
                />
                <QuickAction
                  icon={Camera}
                  label="CCTV"
                  onClick={() => handleQuickAction('Info CCTV')}
                  isDarkMode={isDarkMode}
                  color="green"
                />
                <QuickAction
                  icon={Code}
                  label="Website"
                  onClick={() => handleQuickAction('Jasa website development')}
                  isDarkMode={isDarkMode}
                  color="orange"
                />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className={cn(
            "flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 border-t",
            isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
          )}>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                className={cn(
                  "flex-1 text-sm",
                  isDarkMode 
                    ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-10 sm:h-11" 
                    : "bg-gray-100 border-0 h-10 sm:h-11"
                )}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "px-3 sm:px-4 transition-all duration-300 h-10 sm:h-11",
                  input.trim() && !isLoading
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    : "bg-gray-300"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className={cn(
              "flex items-center justify-center gap-1 text-[10px] sm:text-xs mt-2",
              isDarkMode ? "text-gray-600" : "text-gray-400"
            )}>
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>Powered by Kimi AI</span>
              {AIChatbotConfig.hasApiKey && (
                <>
                  <span className="mx-1">•</span>
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default Chatbot;
