import { useEffect, useMemo, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, Check, Clock, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderService } from '@/lib/db';
import { usePayment, type PaymentResult } from '@/hooks/usePayment';
import { useAppStore } from '@/store/appStore';
import { supabase } from '@/lib/supabase';
import { TurnstileWidget } from '@/components/TurnstileWidget';

type CheckoutStep = 'review' | 'payment' | 'success';
type CreatedPayment = NonNullable<PaymentResult['payment']>;

function QRISDisplay({ qrString, qrImage }: { qrString?: string; qrImage?: string }) {
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!qrString) return undefined;
    QRCode.toDataURL(qrString, { errorCorrectionLevel: 'M', margin: 2, width: 512 })
      .then((url) => { if (!cancelled) setGeneratedQr(url); })
      .catch(() => { if (!cancelled) setHasError(true); });
    return () => { cancelled = true; };
  }, [qrString]);

  if (generatedQr) return <img src={generatedQr} alt="QRIS pembayaran" className="mx-auto aspect-square w-full max-w-64 object-contain" />;
  if (!qrString && qrImage) return <img src={qrImage} alt="QRIS pembayaran" className="mx-auto aspect-square w-full max-w-64 object-contain" />;
  return <div role="status" className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center rounded-md bg-muted px-4 text-sm text-muted-foreground">{hasError ? 'QRIS belum tersedia' : 'QRIS sedang disiapkan'}</div>;
}

const formatPrice = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value);

export function CheckoutSection() {
  const navigate = useNavigate();
  const { user, getSelectedItems, clearCart } = useAppStore();
  const { createPayment, checkStatus, isLoading } = usePayment();
  const items = getSelectedItems();
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const [step, setStep] = useState<CheckoutStep>('review');
  const [payment, setPayment] = useState<CreatedPayment | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const handleTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  // Resume pending payment on mount — avoid creating a duplicate if user refreshes
  useEffect(() => {
    if (!user) return;
    supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.provider_transaction_id) return;
        if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return;
        setPayment({
          id: data.id,
          order_id: data.order_id,
          provider: data.provider,
          payment_method: data.payment_method ?? 'qris',
          provider_transaction_id: data.provider_transaction_id,
          amount: data.amount,
          fee: data.fee ?? 0,
          status: data.status,
          qr_string: data.qr_string ?? undefined,
          qr_image: data.qr_image ?? undefined,
          qr_url: data.qr_url ?? undefined,
          payment_url: data.payment_url ?? undefined,
          reference: data.provider_transaction_id,
          expires_at: data.expires_at ?? undefined,
        });
        setStep('payment');
      });
  // ponytail: run once on mount — user identity sufficient as dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) navigate('/auth?redirect=/checkout', { replace: true });
    else if (!items.length && step === 'review') navigate('/cart', { replace: true });
  }, [items.length, navigate, step, user]);

  useEffect(() => {
    if (step !== 'payment' || !payment) return;
    let stopped = false;
    let inFlight = false;
    const startedAt = Date.now();
    const interval = { current: undefined as number | undefined };
    const stopPolling = () => {
      stopped = true;
      if (interval.current !== undefined) window.clearInterval(interval.current);
    };
    const poll = async () => {
      if (stopped || inFlight) return;
      if (Date.now() - startedAt >= 30 * 60_000) { stopPolling(); return; }
      inFlight = true;
      const result = await checkStatus(payment.order_id);
      inFlight = false;
      if (stopped) return;
      if (result?.status === 'paid') { clearCart(); setStep('success'); stopPolling(); }
      else if (result?.status === 'failed' || result?.status === 'expired') {
        toast.error(result.status === 'expired' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal');
        stopPolling();
      }
    };
    void poll();
    interval.current = window.setInterval(() => void poll(), 10_000);
    return stopPolling;
  }, [checkStatus, clearCart, payment, step]);

  const submitOrder = async () => {
    if (!user || !items.length || total <= 0) return;
    const orderId = `ORDER-${crypto.randomUUID()}`;
    try {
      await OrderService.create({
        id: orderId, user_id: user.uid, total_amount: total, status: 'pending',
        items: items.map((item) => ({
          product_id: item.productId, title: item.title, tier: item.tier,
          price: item.price, quantity: item.quantity, image: item.image,
        })),
      });
      const result = await createPayment(orderId, total, 'qris', turnstileToken ?? undefined);
      if (!result.success || !result.payment) throw new Error(result.error || 'Payment creation failed');
      setPayment(result.payment);
      setStep('payment');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout gagal');
    }
  };

  if (step === 'success') return <main className="min-h-screen bg-background px-4 py-10">
    <Card className="mx-auto max-w-md"><CardContent className="space-y-5 p-8 text-center">
      <Check className="mx-auto h-14 w-14 text-green-600" /><h1 className="text-2xl font-bold">Pembayaran berhasil</h1>
      <p className="text-muted-foreground">Pesanan Anda telah diterima dan akan diproses.</p>
      <Button asChild className="w-full"><Link to="/">Kembali ke beranda</Link></Button>
    </CardContent></Card>
  </main>;

  if (step === 'payment' && payment) {
    return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setStep('review')} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-xl font-bold">Pembayaran QRIS</h1></div>
      <Card><CardContent className="space-y-5 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Status: {payment.status}</div>
        <QRISDisplay key={payment.qr_string || payment.qr_image || 'missing'} qrString={payment.qr_string} qrImage={payment.qr_image} />
        <div><p className="text-sm text-muted-foreground">Total pembayaran</p><p className="text-2xl font-bold">{formatPrice(payment.amount + (payment.fee || 0))}</p></div>
        {payment.payment_url && <Button asChild variant="outline" className="w-full"><a href={payment.payment_url} target="_blank" rel="noreferrer">Buka halaman pembayaran <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
        <p className="text-xs text-muted-foreground">Status diperiksa otomatis dari provider.</p>
      </CardContent></Card>
    </div></main>;
  }

  return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-lg space-y-4">
    <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/cart" aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Link></Button><h1 className="text-xl font-bold">Checkout</h1></div>
    <Card><CardHeader><CardTitle>Ringkasan pesanan</CardTitle></CardHeader><CardContent className="space-y-4">
      {items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b pb-3 last:border-0"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.tier} x{item.quantity}</p></div><p className="font-medium">{formatPrice(item.price * item.quantity)}</p></div>)}
      <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
    </CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><QrCode className="h-6 w-6" /><div><p className="font-medium">QRIS</p><p className="text-sm text-muted-foreground">Bayar menggunakan QRIS. Status pembayaran akan diperiksa otomatis.</p></div></CardContent></Card>
    <TurnstileWidget onToken={handleTurnstileToken} action="login" />
    <Button className="w-full" disabled={isLoading || !items.length} onClick={() => void submitOrder()}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}Buat pembayaran QRIS</Button>
  </div></main>;
}

export default CheckoutSection;
