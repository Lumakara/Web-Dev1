import { useState, useEffect } from 'react';
import { Search, CreditCard, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Payment {
  id: string;
  order_id: string;
  provider: string;
  payment_method: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  fallback_provider?: string;
  fallback_reason?: string;
  payment_data?: any;
}

interface PaymentEvent {
  id: string;
  payment_id: string;
  event_type: string;
  status: string;
  message?: string;
  created_at: string;
}

export function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<Record<string, PaymentEvent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*, payment_events(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const groupedEvents: Record<string, PaymentEvent[]> = {};
      const filtered = (paymentsData || []).filter((p: any) => {
        groupedEvents[p.id] = p.payment_events || [];
        return true;
      }).map((p: any) => ({ ...p, payment_events: undefined })) as Payment[];
      
      setPayments(filtered);
      setEvents(groupedEvents);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Gagal memuat pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredPayments = payments.filter(p => 
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <Button variant="outline" size="sm" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari pembayaran..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada pembayaran</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(payment)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">#{payment.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{new Date(payment.created_at).toLocaleDateString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-1">{payment.provider} • {payment.payment_method}</p>
                  </div>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-blue-600 mt-3">Rp {payment.amount.toLocaleString('id-ID')}</p>
                {payment.fallback_provider && (
                  <p className="text-xs text-orange-600 mt-1">Fallback: {payment.fallback_provider}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ID Order</p>
                  <p>{selectedPayment.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p>{selectedPayment.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Metode</p>
                  <p>{selectedPayment.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedPayment.status)}>{selectedPayment.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Jumlah</p>
                  <p className="font-bold">Rp {selectedPayment.amount.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Waktu Dibayar</p>
                  <p>{selectedPayment.paid_at || '-'}</p>
                </div>
              </div>

              {selectedPayment.payment_data && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Data Pembayaran</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedPayment.payment_data, null, 2)}
                  </pre>
                </div>
              )}

              {events[selectedPayment.id]?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Riwayat Event</p>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {events[selectedPayment.id].map((event: PaymentEvent) => (
                      <div key={event.id} className="bg-gray-50 p-2 rounded text-sm border">
                        <span className="font-medium">{event.event_type}</span>
                        {' → '}
                        <Badge variant="outline">{event.status}</Badge>
                        <p className="text-xs text-gray-500 mt-1">{new Date(event.created_at).toLocaleString('id-ID')}</p>
                        {event.message && <p className="text-xs text-gray-500">{event.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setShowDetailDialog(false)}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
