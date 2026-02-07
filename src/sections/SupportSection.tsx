import { useState, useRef, useEffect } from 'react';
import { 
  Mail, Phone, Send, ChevronDown, ChevronUp, 
  Check, Loader2, Bot, Sparkles, 
  X, Zap, HelpCircle, Ticket, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupport, type TicketFormData } from '@/hooks/useSupport';
import { useProducts } from '@/hooks/useProducts';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';
import { TelegramBot } from '@/lib/telegram';

// AI Chatbot responses
interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  image?: string;
  products?: Array<{
    id: string;
    title: string;
    price: number;
    image: string;
  }>;
  timestamp: Date;
}

const faqs = [
  {
    question: 'Berapa lama waktu instalasi Wi-Fi?',
    answer: 'Waktu instalasi Wi-Fi biasanya memakan waktu 1-2 jam tergantung ukuran rumah dan kompleksitas jaringan. Tim kami akan memberikan estimasi waktu yang lebih akurat setelah survey lokasi.'
  },
  {
    question: 'Apa yang termasuk dalam paket instalasi CCTV?',
    answer: 'Paket instalasi CCTV kami mencakup pemasangan kamera, setup DVR, konfigurasi aplikasi mobile, dan training dasar penggunaan. Garansi perangkat juga disertakan sesuai tier yang dipilih.'
  },
  {
    question: 'Apakah ada garansi untuk layanan yang diberikan?',
    answer: 'Ya, semua layanan kami dilengkapi dengan garansi. Periode garansi bervariasi tergantung jenis layanan dan tier yang dipilih, mulai dari 1 tahun hingga 3 tahun.'
  },
  {
    question: 'Bagaimana cara melacak status pesanan saya?',
    answer: 'Anda dapat melacak status pesanan melalui menu Profil > Riwayat Pesanan. Status pesanan akan diupdate secara real-time dan Anda juga akan menerima notifikasi email untuk setiap perubahan status.'
  },
  {
    question: 'Bisakah saya membatalkan atau mengubah pesanan?',
    answer: 'Pesanan dapat dibatalkan atau diubah selama status masih "pending". Setelah pembayaran dikonfirmasi, perubahan dapat dilakukan dengan menghubungi tim support kami.'
  }
];

const categories = [
  'Masalah Teknis',
  'Pertanyaan Billing',
  'Dukungan Instalasi',
  'Status Pesanan',
  'Lainnya'
];

// Map Indonesian categories to English for Telegram
const categoryMap: Record<string, string> = {
  'Masalah Teknis': 'technical',
  'Pertanyaan Billing': 'billing',
  'Dukungan Instalasi': 'installation',
  'Status Pesanan': 'account',
  'Lainnya': 'other',
};

// AI Response Generator
function generateAIResponse(userMessage: string, products: any[]): { 
  text: string; 
  image?: string; 
  products?: Array<{id: string; title: string; price: number; image: string}> 
} {
  const msg = userMessage.toLowerCase();
  
  // Greetings
  if (msg.includes('halo') || msg.includes('hi') || msg.includes('hello')) {
    return {
      text: 'Halo! 👋 Saya adalah AI Assistant Layanan Digital. Saya bisa membantu Anda dengan:\n\n• Info produk & layanan\n• Rekomendasi sesuai kebutuhan\n• Panduan pemesanan\n• Status pesanan\n• FAQ\n\nAda yang bisa saya bantu hari ini?'
    };
  }
  
  // WiFi related
  if (msg.includes('wifi') || msg.includes('internet')) {
    const wifiProduct = products.find(p => p.id === 'wifi');
    return {
      text: 'Kami menyediakan layanan instalasi Wi-Fi profesional! 🌐\n\nPaket yang tersedia:\n• Basic: Rp 89.000 (1 router, konfigurasi dasar)\n• Standard: Rp 149.000 (Mesh network, keamanan advanced)\n• Premium: Rp 249.000 (Enterprise system, priority support)\n\nDurasi: 2-3 jam dengan garansi hingga 3 tahun.',
      image: wifiProduct?.image,
      products: wifiProduct ? [{
        id: wifiProduct.id,
        title: wifiProduct.title,
        price: wifiProduct.base_price,
        image: wifiProduct.icon
      }] : undefined
    };
  }
  
  // CCTV related
  if (msg.includes('cctv') || msg.includes('kamera') || msg.includes('keamanan')) {
    const cctvProduct = products.find(p => p.id === 'cctv');
    return {
      text: 'Layanan CCTV Security System kami mencakup: 📹\n\n• 2-8 kamera HD/4K\n• Night vision & motion detection\n• Akses mobile app\n• Cloud backup\n• Storage 1-4 TB\n\nPaket mulai dari Rp 199.000 dengan garansi 1-3 tahun.',
      image: cctvProduct?.image,
      products: cctvProduct ? [{
        id: cctvProduct.id,
        title: cctvProduct.title,
        price: cctvProduct.base_price,
        image: cctvProduct.icon
      }] : undefined
    };
  }
  
  // Code/Debugging
  if (msg.includes('coding') || msg.includes('debug') || msg.includes('error') || msg.includes('program')) {
    const codeProduct = products.find(p => p.id === 'code');
    return {
      text: 'Butuh bantuan coding? Kami bisa membantu! 💻\n\nLayanan Code Error Repair:\n• Identifikasi & fix bug\n• Code review & refactoring\n• Performance optimization\n• Security audit\n\nMulai dari Rp 59.000 dengan 5 revisi gratis.',
      image: codeProduct?.image,
      products: codeProduct ? [{
        id: codeProduct.id,
        title: codeProduct.title,
        price: codeProduct.base_price,
        image: codeProduct.icon
      }] : undefined
    };
  }
  
  // Photo/Video Editing
  if (msg.includes('edit') || msg.includes('foto') || msg.includes('video') || msg.includes('photo')) {
    const photoProduct = products.find(p => p.id === 'photo');
    const videoProduct = products.find(p => p.id === 'video');
    return {
      text: 'Layanan editing kreatif kami: 🎨🎬\n\n📸 Photo Editing: Rp 29.000 - Rp 149.000\n• Color correction & retouching\n• Background removal\n• RAW processing\n\n🎥 Video Editing: Rp 79.000 - Rp 399.000\n• Color grading & VFX\n• Motion graphics\n• Sound mixing',
      products: [photoProduct, videoProduct].filter(Boolean).map(p => ({
        id: p.id,
        title: p.title,
        price: p.base_price,
        image: p.icon
      }))
    };
  }
  
  // VPS/Hosting
  if (msg.includes('vps') || msg.includes('hosting') || msg.includes('server')) {
    const vpsProduct = products.find(p => p.id === 'vps');
    return {
      text: 'Solusi VPS Hosting kami: 🖥️\n\n• Basic: 2 CPU, 4GB RAM, 50GB SSD - Rp 49.000\n• Standard: 4 CPU, 8GB RAM, 100GB SSD - Rp 99.000\n• Premium: 8 CPU, 16GB RAM, 200GB SSD - Rp 199.000\n\nSemua paket include 1-2TB bandwidth!',
      image: vpsProduct?.image,
      products: vpsProduct ? [{
        id: vpsProduct.id,
        title: vpsProduct.title,
        price: vpsProduct.base_price,
        image: vpsProduct.icon
      }] : undefined
    };
  }
  
  // Price/Promo
  if (msg.includes('harga') || msg.includes('price') || msg.includes('promo') || msg.includes('diskon')) {
    const cheapest = products.reduce((min, p) => p.base_price < min.base_price ? p : min, products[0]);
    return {
      text: `Kami memiliki berbagai layanan dengan harga terbaik! 💰\n\nLayanan termurah: ${cheapest.title} mulai Rp ${cheapest.base_price.toLocaleString('id-ID')}\n\nSemua layanan memiliki 3 tier: Basic, Standard, Premium dengan fitur berbeda. Cek halaman produk untuk detail lengkap dan promo terbaru!`
    };
  }
  
  // Order status
  if (msg.includes('status') || msg.includes('pesanan') || msg.includes('order')) {
    return {
      text: 'Untuk cek status pesanan: 📦\n\n1. Login ke akun Anda\n2. Buka menu Profil > Riwayat Pesanan\n3. Lihat status real-time\n\nStatus yang tersedia:\n• Pending - Menunggu pembayaran\n• Processing - Sedang dikerjakan\n• Completed - Selesai\n\nAtau kirim email ke support@lumakara.com dengan nomor order Anda.'
    };
  }
  
  // Help
  if (msg.includes('bantu') || msg.includes('help') || msg.includes('cara')) {
    return {
      text: 'Saya siap membantu! 🆘\n\nPilih topik yang Anda butuhkan:\n• Info produk (WiFi, CCTV, Coding, Editing, VPS)\n• Cara pemesanan\n• Status pesanan\n• Garansi & refund\n• Teknis/support\n\nAtau kirim pertanyaan spesifik Anda!'
    };
  }
  
  // Default response
  return {
    text: 'Terima kasih atas pertanyaannya! 🤔\n\nUntuk informasi lebih detail, Anda bisa:\n• Lihat produk kami di halaman Beranda\n• Chat dengan admin melalui Live Chat\n• Kirim tiket dukungan\n• Hubungi WhatsApp kami\n\nAda hal lain yang bisa saya bantu?'
  };
}

export function SupportSection() {
  const { submitTicket, isSubmitting } = useSupport();
  const { products } = useProducts();
  const { isDarkMode } = useAppStore();
  
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Halo! 👋 Saya AI Assistant Layanan Digital.\n\nSaya bisa membantu dengan:\n• Informasi produk & layanan\n• Rekomendasi sesuai kebutuhan\n• Panduan pemesanan\n• FAQ\n\nAda yang bisa saya bantu?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<TicketFormData>({
    subject: '',
    category: '',
    email: '',
    description: ''
  });

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    audioService.playClick();
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const response = generateAIResponse(userMsg.text, products);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        isUser: false,
        image: response.image,
        products: response.products,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      audioService.playNotification();
    }, 1000 + Math.random() * 1000);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    audioService.playClick();
    
    try {
      // Generate unique ticket ID
      const ticketId = `TICKET-${Date.now().toString(36).toUpperCase()}`;
      const timestamp = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      // Send ticket notification using TelegramBot
      await TelegramBot.sendTicketNotification({
        ticketId: ticketId,
        subject: formData.subject,
        category: categoryMap[formData.category] || 'general',
        email: formData.email,
        description: formData.description,
        timestamp: timestamp,
      });
      
      // Also save to Firestore
      await submitTicket(formData);
      
      setTicketSubmitted(true);
      audioService.playSuccess();
      toast.success('Tiket berhasil dikirim! Kami akan menghubungi Anda segera.');
      
      setTimeout(() => {
        setShowTicketForm(false);
        setTicketSubmitted(false);
        setFormData({ subject: '', category: '', email: '', description: '' });
      }, 3000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Gagal mengirim tiket. Silakan coba lagi.');
    }
  };

  const handleProductClick = (productId: string) => {
    audioService.playClick();
    window.location.href = `/?product=${productId}`;
  };

  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const cardBgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';

  return (
    <div className={`pb-20 px-4 pt-4 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className={`text-2xl font-bold ${textClass}`}>Pusat Bantuan</h1>
        <p className={subTextClass}>Kami siap membantu Anda 24/7</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => { audioService.playClick(); setChatOpen(true); }}
          className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${
            isDarkMode ? 'bg-green-900/30 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100'
          }`}
        >
          <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>AI Chat</span>
          <span className={`text-xs ${isDarkMode ? 'text-green-500' : 'text-green-600'}`}>24/7 Online</span>
        </button>

        <button
          onClick={() => { audioService.playClick(); setShowTicketForm(true); }}
          className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${
            isDarkMode ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
            <Ticket className="h-7 w-7 text-white" />
          </div>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>Tiket</span>
          <span className={`text-xs ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>2-4 jam</span>
        </button>

        <a
          href="tel:+6281234567890"
          onClick={() => audioService.playClick()}
          className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${
            isDarkMode ? 'bg-orange-900/30 hover:bg-orange-900/50' : 'bg-orange-50 hover:bg-orange-100'
          }`}
        >
          <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
            <Phone className="h-7 w-7 text-white" />
          </div>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>Telepon</span>
          <span className={`text-xs ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>24 jam</span>
        </a>
      </div>

      {/* FAQ Section */}
      <div className="mb-6">
        <h2 className={`text-lg font-bold mb-3 ${textClass}`}>Pertanyaan Umum</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <Card key={index} className={`overflow-hidden transition-all ${cardBgClass}`}>
              <button
                onClick={() => {
                  audioService.playClick();
                  setExpandedFaq(expandedFaq === index ? null : index);
                }}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <span className={`font-medium text-sm pr-4 ${textClass}`}>{faq.question}</span>
                {expandedFaq === index ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                )}
              </button>
              {expandedFaq === index && (
                <div className={`px-4 pb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p className="text-sm">{faq.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* AI Support Card */}
      <Card className={`mb-4 overflow-hidden ${isDarkMode ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50' : 'bg-gradient-to-r from-purple-50 to-blue-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${textClass}`}>AI Assistant</h3>
              <p className={`text-sm ${subTextClass}`}>Tanya apa saja tentang produk & layanan</p>
            </div>
            <Button 
              onClick={() => { audioService.playClick(); setChatOpen(true); }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Chat Sekarang
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submit Ticket Card */}
      <Card className={`${isDarkMode ? 'bg-gradient-to-r from-blue-900/50 to-cyan-900/50' : 'bg-gradient-to-r from-blue-50 to-cyan-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${textClass}`}>Kirim Tiket Dukungan</h3>
              <p className={`text-sm ${subTextClass}`}>Laporkan masalah detail ke tim kami</p>
            </div>
            <Button 
              onClick={() => { audioService.playClick(); setShowTicketForm(true); }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Buat Tiket
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Form Dialog */}
      <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-auto ${isDarkMode ? 'bg-gray-900 border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={textClass}>Kirim Tiket Dukungan</DialogTitle>
          </DialogHeader>

          {ticketSubmitted ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">Tiket Terkirim! 🎉</h3>
              <p className="text-gray-600">Kami akan segera menghubungi Anda via email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className={textClass}>Subjek</Label>
                <Input
                  id="subject"
                  placeholder="Ringkasan masalah Anda"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className={textClass}>Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className={isDarkMode ? 'text-white' : ''}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={textClass}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@anda.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className={textClass}>Deskripsi</Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan masalah Anda secara detail..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}
                />
                <p className={`text-xs text-right ${subTextClass}`}>
                  {formData.description.length}/500 karakter
                </p>
              </div>

              <div className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Tiket akan dikirim ke tim support kami via Telegram
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Tiket
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Chat Widget */}
      {chatOpen && (
        <div className={`fixed bottom-20 right-4 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up ${
          isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
        }`}>
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-orange-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">AI Assistant</p>
                <div className="flex items-center gap-1 text-xs text-white/80">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Online 24/7
                </div>
              </div>
            </div>
            <button 
              onClick={() => { audioService.playClick(); setChatOpen(false); }}
              className="text-white/80 hover:text-white p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Chat Messages */}
          <ScrollArea className="h-80 p-4">
            <div className="space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.isUser ? 'order-2' : 'order-1'}`}>
                    {/* Avatar */}
                    {!msg.isUser && (
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-1">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`p-3 rounded-2xl text-sm whitespace-pre-line ${
                        msg.isUser 
                          ? 'bg-blue-600 text-white rounded-br-md' 
                          : isDarkMode 
                            ? 'bg-gray-800 text-gray-200 rounded-bl-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                    
                    {/* Product Image */}
                    {msg.image && (
                      <div className="mt-2 rounded-xl overflow-hidden shadow-md">
                        <img src={msg.image} alt="Product" className="w-full h-32 object-cover" />
                      </div>
                    )}
                    
                    {/* Product Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.products.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleProductClick(product.id)}
                            className={`w-full p-2 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] ${
                              isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                            } shadow-md`}
                          >
                            <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded-lg" />
                            <div className="flex-1 text-left">
                              <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{product.title}</p>
                              <p className="text-xs text-blue-600 font-bold">Rp {product.price.toLocaleString('id-ID')}</p>
                            </div>
                            <Zap className="h-4 w-4 text-orange-500" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className={`p-3 rounded-2xl rounded-bl-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          
          {/* Chat Input */}
          <div className={`p-3 border-t flex gap-2 ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'bg-gray-50'}`}>
            <Input
              placeholder="Ketik pesan..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
              className={`flex-1 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
            />
            <Button 
              size="icon" 
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isTyping}
              className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportSection;
