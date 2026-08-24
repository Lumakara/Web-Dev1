import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useReviews } from '@/hooks/useReviews';

interface Props { productId: string }

function StarRating({ value, onChange, readonly = false }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-5 h-5 cursor-${readonly ? 'default' : 'pointer'} transition-colors ${
            i <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          }`}
          onClick={() => !readonly && onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
        />
      ))}
    </div>
  );
}

export function ReviewSection({ productId }: Props) {
  const { reviews, loading, fetchReviews, submitReview } = useReviews(productId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  // Rating distribution
  const dist = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0,
  }));

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    const ok = await submitReview(rating, comment, displayName);
    if (ok) { setRating(0); setComment(''); setDisplayName(''); setShowForm(false); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-6 items-start">
        <div className="text-center">
          <div className="text-4xl font-bold">{avgRating}</div>
          <StarRating value={Math.round(Number(avgRating))} readonly />
          <div className="text-xs text-muted-foreground mt-1">{reviews.length} ulasan</div>
        </div>
        <div className="flex-1 space-y-1">
          {dist.map(({ star, pct, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right">{star}</span>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 bg-muted rounded-full h-1.5">
                <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write review toggle */}
      {!showForm ? (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          ✍️ Tulis Ulasan
        </Button>
      ) : (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <div>
            <p className="text-sm font-medium mb-1">Rating kamu</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <Input
            placeholder="Nama (opsional)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={50}
          />
          <Textarea
            placeholder="Ceritakan pengalamanmu dengan produk ini..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!rating || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat ulasan...</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-muted-foreground">Belum ada ulasan. Jadilah yang pertama! ⭐</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                  {r.display_name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium">{r.display_name}</span>
                <StarRating value={r.rating} readonly />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
