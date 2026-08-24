import { useState } from 'react';
import {
  Mail, ChevronDown, ChevronUp,
  Check, Loader2, Sparkles,
  HelpCircle, AlertCircle, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupport, type TicketFormData } from '@/hooks/useSupport';
import { useAppStore } from '@/store/appStore';
import { audioService } from '@/lib/audio';
import { toast } from 'sonner';
import { TelegramBot } from '@/lib/telegram';
import { Chatbot } from '@/components/Chatbot';

const faqs = [
  {
    question: 'Berapa lama waktu instalasi Wi-Fi?',
    answer: 'Waktu instalasi Wi-Fi biasanya memakan waktu 1-2 jam tergantung ukuran rumah dan kompleksitas jaringan.'
  },
  {
    question: 'Apa yang termasuk dalam paket instalasi CCTV?',
    answer: 'Paket instalasi CCTV mencakup pemasangan kamera, setup DVR, konfigurasi aplikasi mobile, dan training dasar.'
  },
  {
    question: 'Apakah ada garansi untuk layanan yang diberikan?',
    answer: 'Ya, semua layanan dilengkapi garansi mulai dari 1 tahun hingga 3 tahun tergantung tier.'
  },
  {
    question: 'Bagaimana cara melacak status pesanan saya?',
    answer: 'Buka menu Profil > Riwayat Pesanan. Status diupdate real-time dan notifikasi email dikirim setiap perubahan.'
  },
  {
    question: 'Bisakah saya membatalkan atau mengubah pesanan?',
    answer: 'Pesanan dapat dibatalkan selama status masih "pending". Setelah pembayaran dikonfirmasi, hubungi support kami.'
  }
];

const categories = ['Masalah Teknis', 'Pertanyaan Billing', 'Dukungan Instalasi', 'Status Pesanan', 'Lainnya'];

const categoryMap: Record<string, string> = {
  'Masalah Teknis': 'technical',
  'Pertanyaan Billing': 'billing',
  'Dukungan Instalasi': 'installation',
  'Status Pesanan': 'account',
  'Lainnya': 'other',
};

export function SupportSection() {
  const { submitTicket, isSubmitting } = useSupport();
  const { isDarkMode } = useAppStore();

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [formData, setFormData] = useState<TicketFormData>({
    subject: '',
    category: '',
    email: '',
    description: ''
  });

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    audioService.playClick();
    try {
      const ticketId = `TICKET-${Date.now().toString(36).toUpperCase()}`;
      const timestamp = new Date().toLocaleString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      await TelegramBot.sendTicketNotification({
        ticketId,
        subject: formData.subject,
        category: categoryMap[formData.category] || 'general',
        email: formData.email,
        description: formData.description,
        timestamp,
      });
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

  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const cardBgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';

  return (
    <div className="pb-20 px-4 pt-4 min-h-screen bg-background text-foreground">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-soft">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className={`text-2xl font-bold ${textClass}`}>Pusat Bantuan</h1>
        <p className={subTextClass}>Kami siap membantu Anda 24/7</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => { audioService.playClick(); setChatOpen(true); }}
          className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-green-900/30 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100'}`}
        >
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-2 shadow-soft">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>AI Chat</span>
          <span className={`text-xs ${isDarkMode ? 'text-green-500' : 'text-green-600'}`}>24/7 Online</span>
        </button>
        <button
          onClick={() => { audioService.playClick(); setShowTicketForm(true); }}
          className={`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'}`}
        >
          <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center mb-2 shadow-soft">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>Tiket</span>
          <span className={`text-xs ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>2-4 jam</span>
        </button>
      </div>

      <div className="mb-6">
        <h2 className={`text-lg font-bold mb-3 ${textClass}`}>Pertanyaan Umum</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <Card key={index} className={`overflow-hidden transition-all ${cardBgClass}`}>
              <button
                onClick={() => { audioService.playClick(); setExpandedFaq(expandedFaq === index ? null : index); }}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <span className={`font-medium text-sm pr-4 ${textClass}`}>{faq.question}</span>
                {expandedFaq === index
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                }
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

      <Card className="mb-4 overflow-hidden bg-card border-border shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-soft">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${textClass}`}>AI Assistant</h3>
              <p className={`text-sm ${subTextClass}`}>Tanya apa saja tentang produk & layanan</p>
            </div>
            <Button onClick={() => { audioService.playClick(); setChatOpen(true); }}
              className="bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors">
              Chat Sekarang
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-soft">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${textClass}`}>Kirim Tiket Dukungan</h3>
              <p className={`text-sm ${subTextClass}`}>Laporkan masalah detail ke tim kami</p>
            </div>
            <Button onClick={() => { audioService.playClick(); setShowTicketForm(true); }}
              className="bg-blue-600 hover:bg-blue-700">
              Buat Tiket
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <h3 className="text-xl font-bold text-green-600 mb-2">Tiket Terkirim!</h3>
              <p className="text-gray-600">Kami akan segera menghubungi Anda via email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className={textClass}>Subjek</Label>
                <Input id="subject" placeholder="Ringkasan masalah Anda"
                  value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className={textClass}>Kategori</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <Input id="email" type="email" placeholder="email@anda.com"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className={textClass}>Deskripsi</Label>
                <Textarea id="description" placeholder="Jelaskan masalah Anda secara detail..." rows={4}
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''} />
              </div>
              <div className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Tiket akan dikirim ke tim support kami via Telegram
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-secondary text-primary-foreground font-semibold transition-colors" disabled={isSubmitting}>
                {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>) : (<><Send className="h-4 w-4 mr-2" />Kirim Tiket</>)}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <Chatbot />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SupportSection;
