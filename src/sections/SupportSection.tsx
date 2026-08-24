import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mail, ChevronDown, ChevronUp, Check, Loader2, Sparkles, HelpCircle, AlertCircle, Send,
  Phone, MessageCircle, Copy, Search, Mic, Link2, Upload, ThumbsUp, ThumbsDown,
  Wifi, WifiOff, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLiveCS } from '@/hooks/useLiveCS';
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
import { supabase } from '@/lib/supabase';

// Konstanta support contact
const SUPPORT_WA = 'https://wa.me/6281234567890';
const SUPPORT_PHONE = 'tel:+6281234567890';
const SUPPORT_EMAIL = 'support@lumakara.com';

// Quick replies template
const quickReplies = [
  'Kapan pesanan saya diproses?',
  'Bagaimana cara refund?',
  'Status instalasi saya'
];

// FAQ data dengan helpful count dan related FAQ
const faqs = [
  {
    id: 1,
    question: 'Berapa lama waktu instalasi Wi-Fi?',
    answer: 'Waktu instalasi Wi-Fi biasanya memakan waktu 1-2 jam tergantung ukuran rumah dan kompleksitas jaringan.',
    helpfulCount: 24,
    relatedFaqs: [2, 3]
  },
  {
    id: 2,
    question: 'Apa yang termasuk dalam paket instalasi CCTV?',
    answer: 'Paket instalasi CCTV mencakup pemasangan kamera, setup DVR, konfigurasi aplikasi mobile, dan training dasar.',
    helpfulCount: 18,
    relatedFaqs: [1, 5]
  },
  {
    id: 3,
    question: 'Apakah ada garansi untuk layanan yang diberikan?',
    answer: 'Ya, semua layanan dilengkapi garansi mulai dari 1 tahun hingga 3 tahun tergantung tier.',
    helpfulCount: 32,
    relatedFaqs: [2]
  },
  {
    id: 4,
    question: 'Bagaimana cara melacak status pesanan saya?',
    answer: 'Buka menu Profil > Riwayat Pesanan. Status diupdate real-time dan notifikasi email dikirim setiap perubahan.',
    helpfulCount: 45,
    relatedFaqs: []
  },
  {
    id: 5,
    question: 'Bisakah saya membatalkan atau mengubah pesanan?',
    answer: 'Pesanan dapat dibatalkan selama status masih "pending". Setelah pembayaran dikonfirmasi, hubungi support kami.',
    helpfulCount: 15,
    relatedFaqs: [4]
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
  const [expandedFaq, setExpandedFaq] = useState<number | 'all' | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Search FAQ
  const [faqSearch, setFaqSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Status Tracker
  const [trackingId, setTrackingId] = useState('');

  // Upload screenshot
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Form data dengan priority
  const [formData, setFormData] = useState<TicketFormData & { priority: 'low' | 'medium' | 'high' }>({
    subject: '',
    category: '',
    email: '',
    description: '',
    priority: 'medium'
  });

  // Live CS via Telegram
  const { messages: csMessages, isCSOnline } = useLiveCS();
  const [avgResponse] = useState('2-4 jam'); // ponytail: hardcoded, add analytics when needed

  // Filter FAQ by search
  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return faqs;
    const search = faqSearch.toLowerCase();
    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(search) ||
      faq.answer.toLowerCase().includes(search)
    );
  }, [faqSearch]);

  // Sort FAQ by helpful count (prioritize most helpful)
  const sortedFaqs = useMemo(() => {
    return [...filteredFaqs].sort((a, b) => b.helpfulCount - a.helpfulCount);
  }, [filteredFaqs]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // Auto-draft save setiap 2 detik
  useEffect(() => {
    if (!formData.subject && !formData.description) return;
    const timer = setTimeout(() => {
      localStorage.setItem('support_draft', JSON.stringify(formData));
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData]);

  // Load draft saat mount
  useEffect(() => {
    const draft = localStorage.getItem('support_draft');
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
        toast.info('Draft tiket dipulihkan');
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Handle file upload dengan Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setUploadedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('support-screenshots')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('support-screenshots')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Gagal upload screenshot');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    audioService.playClick();

    try {
      let screenshotUrl = '';

      // Upload screenshot ke Supabase jika ada
      if (uploadedFile) {
        const url = await uploadToSupabase(uploadedFile);
        if (!url) return; // Upload gagal
        screenshotUrl = url;
      }

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
        priority: formData.priority,
        screenshotUrl
      });

      await submitTicket(formData);
      setTicketSubmitted(true);
      audioService.playSuccess();
      toast.success('Tiket berhasil dikirim! Kami akan menghubungi Anda segera.');

      // Clear draft
      localStorage.removeItem('support_draft');

      setTimeout(() => {
        setShowTicketForm(false);
        setTicketSubmitted(false);
        setFormData({ subject: '', category: '', email: '', description: '', priority: 'medium' });
        setUploadedFile(null);
        setImagePreview('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Gagal mengirim tiket. Silakan coba lagi.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin!`);
    audioService.playClick();
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Browser tidak support voice input');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFaqSearch(transcript);
      toast.success('Voice input berhasil');
    };

    recognition.onerror = () => {
      toast.error('Voice input gagal');
    };

    recognition.start();
    audioService.playClick();
  };

  const copyFaqLink = (id: number) => {
    const url = `${window.location.origin}${window.location.pathname}#faq-${id}`;
    copyToClipboard(url, 'Link FAQ');
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <a
          href={SUPPORT_WA}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => audioService.playClick()}
          className={`flex flex-col items-center p-3 rounded-lg transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-green-900/30 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100'}`}
        >
          <MessageCircle className="h-6 w-6 text-green-500 mb-1" />
          <span className="text-xs font-semibold">WhatsApp</span>
        </a>

        <a
          href={SUPPORT_PHONE}
          onClick={() => audioService.playClick()}
          className={`flex flex-col items-center p-3 rounded-lg transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'}`}
        >
          <Phone className="h-6 w-6 text-blue-500 mb-1" />
          <span className="text-xs font-semibold">Telepon</span>
        </a>

        <button
          onClick={() => copyToClipboard(SUPPORT_EMAIL, 'Email support')}
          className={`flex flex-col items-center p-3 rounded-lg transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-purple-900/30 hover:bg-purple-900/50' : 'bg-purple-50 hover:bg-purple-100'}`}
        >
          <Copy className="h-6 w-6 text-purple-500 mb-1" />
          <span className="text-xs font-semibold">Copy Email</span>
        </button>
      </div>

      {/* Status Tracker */}
      <Card className={`mb-6 ${cardBgClass}`}>
        <CardContent className="p-4">
          <h3 className={`text-sm font-bold mb-3 ${textClass}`}>Lacak Status Tiket</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan ID tiket (contoh: TICKET-ABC123)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className={isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : ''}
            />
  const handleTrackTicket = async () => {
    if (!trackingId.trim()) {
      toast.error('Masukkan ID tiket');
      return;
    }
    audioService.playClick();
    
    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, created_at, updated_at, priority')
      .eq('ticket_id', trackingId)
      .single();
    
    if (error || !data) {
      toast.error('Ticket not found');
      return;
    }
    
    toast.success(`Status: ${data.status} | Priority: ${data.priority}`);
  };
          </div>
        </CardContent>
      </Card>

      {/* Live Response & CS Status */}
      <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          {isCSOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          <span className={`text-sm ${textClass}`}>
            CS {isCSOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <span className={`text-xs ${subTextClass}`}>Respon avg: {avgResponse}</span>
      </div>

      {/* FAQ Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchRef}
            placeholder="Cari FAQ... (Ctrl+K)"
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            className={`pl-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
          />
          <button
            onClick={handleVoiceInput}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <Mic className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-bold ${textClass}`}>
            Pertanyaan Umum ({sortedFaqs.length})
          </h2>
          <button
            onClick={() => {
              setExpandedFaq(expandedFaq === 'all' ? null : 'all');
              audioService.playClick();
            }}
            className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {expandedFaq === 'all' ? 'Tutup Semua' : 'Buka Semua'}
          </button>
        </div>

        <div className="space-y-2">
          {sortedFaqs.map((faq) => (
            <Card key={faq.id} id={`faq-${faq.id}`} className={`overflow-hidden transition-all ${cardBgClass}`}>
              <button
                onClick={() => {
                  setExpandedFaq(expandedFaq === faq.id || expandedFaq === 'all' ? null : faq.id);
                  audioService.playClick();
                }}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <span className={`font-medium text-sm pr-4 ${textClass}`}>{faq.question}</span>
                {(expandedFaq === faq.id || expandedFaq === 'all')
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                }
              </button>

              {(expandedFaq === faq.id || expandedFaq === 'all') && (
                <div className={`px-4 pb-4 space-y-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p className="text-sm">{faq.answer}</p>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => copyFaqLink(faq.id)}
                      className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                    >
                      <Link2 className="h-3 w-3" />
                      Copy Link
                    </button>

                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{faq.helpfulCount} terbantu</span>
                    </div>
                  </div>

                  {faq.relatedFaqs.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold mb-2">FAQ Terkait:</p>
                      <div className="flex flex-wrap gap-2">
                        {faq.relatedFaqs.map(relatedId => {
                          const related = faqs.find(f => f.id === relatedId);
                          if (!related) return null;
                          return (
                            <button
                              key={relatedId}
                              onClick={() => {
                                setExpandedFaq(relatedId);
                                document.getElementById(`faq-${relatedId}`)?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              {related.question}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Action Cards */}
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
          <span className={`text-xs ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>{avgResponse}</span>
        </button>
      </div>

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
              <h3 className="text-xl font-bold text-green-600 mb-2">Tiket Terkirim!</h3>
              <p className="text-gray-600">Kami akan segera menghubungi Anda via email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4 mt-4">
              {/* Quick Replies */}
              <div className="space-y-2">
                <Label className={`${textClass} text-xs`}>Template Cepat</Label>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, subject: reply });
                        audioService.playClick();
                      }}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
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
                  <Label htmlFor="priority" className={textClass}>Prioritas</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}
                  >
                    <SelectTrigger className={isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                      <SelectItem value="low" className={isDarkMode ? 'text-white' : ''}>🟢 Rendah</SelectItem>
                      <SelectItem value="medium" className={isDarkMode ? 'text-white' : ''}>🟡 Sedang</SelectItem>
                      <SelectItem value="high" className={isDarkMode ? 'text-white' : ''}>🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label className={textClass}>Lampirkan Screenshot (Opsional)</Label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="screenshot"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Pilih Gambar</span>
                  </label>
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedFile && (
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      ✓ {uploadedFile.name}
                    </span>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded object-cover border-2 border-gray-300 dark:border-gray-700"
                    />
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Tiket akan dikirim ke tim support kami via Telegram
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-secondary text-primary-foreground font-semibold transition-colors"
                disabled={isSubmitting || uploading}
              >
                {isSubmitting || uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploading ? 'Uploading...' : 'Mengirim...'}
                  </>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Kirim Tiket</>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Chatbot Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <Chatbot />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SupportSection;
