import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Order {
  id: string;
  total_amount: number;
}

interface Props {
  order: Order;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function RefundModal({ order, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Refund — #{order.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Total: <strong>Rp {order.total_amount.toLocaleString('id-ID')}</strong>
          </p>
          <Textarea
            placeholder="Alasan refund (wajib diisi)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            ⚠️ Refund hanya mengubah status di sistem. Proses pengembalian dana dilakukan manual kepada customer.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || loading}
            onClick={async () => {
              setLoading(true);
              await onConfirm(reason);
              onClose();
            }}
          >
            {loading ? 'Memproses...' : 'Konfirmasi Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
