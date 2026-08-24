import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

interface PricingRule {
  id?: string;
  threshold: number;
  markup_percentage: number;
}

interface RoundingConfig {
  rule: string;
  min_markup: number;
}

const ROUNDING_OPTIONS = [
  { value: 'exact', label: 'Exact (tidak dibulatkan)' },
  { value: 'nearest_100', label: 'Nearest 100' },
  { value: 'nearest_1000', label: 'Nearest 1000' },
  { value: 'up_100', label: 'Ceil 100' },
  { value: 'up_1000', label: 'Ceil 1000' },
  { value: 'down_100', label: 'Floor 100' },
  { value: 'down_1000', label: 'Floor 1000' },
];

export function AdminPricing() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [rounding, setRounding] = useState<RoundingConfig>({ rule: 'nearest_100', min_markup: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('pricing_rules').select('*').order('threshold').then(({ data }) => setRules(data ?? []));
    supabase.from('rounding_config').select('*').limit(1).single().then(({ data }) => {
      if (data) setRounding(data);
    });
  }, []);

  const addRule = () => setRules(prev => [...prev, { threshold: 0, markup_percentage: 5 }]);

  const updateRule = (idx: number, field: keyof PricingRule, value: number) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx));

  const saveAll = async () => {
    setSaving(true);
    // Upsert rules
    const toSave = rules.map(r => ({
      ...(r.id ? { id: r.id } : {}),
      threshold: r.threshold,
      markup_percentage: r.markup_percentage,
    }));
    const { error: rulesErr } = await supabase.from('pricing_rules').upsert(toSave, { onConflict: 'id' });
    // Upsert rounding
    const { error: roundErr } = await supabase.from('rounding_config').upsert(rounding);
    setSaving(false);
    if (rulesErr || roundErr) toast.error('Gagal menyimpan');
    else toast.success('Pricing rules berhasil disimpan ✓');
  };

  return (
    <div className="space-y-6">
      {/* Pricing Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Markup Rules</h3>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Rule
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Harga produk di bawah threshold menggunakan markup% dari rule sebelumnya (interpolasi linear).
        </div>
        {rules.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada rule. Markup default 5%.</div>
        )}
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Threshold (Rp)</label>
              <Input
                type="number"
                value={rule.threshold}
                onChange={e => updateRule(idx, 'threshold', Number(e.target.value))}
                placeholder="50000"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Markup %</label>
              <Input
                type="number"
                value={rule.markup_percentage}
                onChange={e => updateRule(idx, 'markup_percentage', Number(e.target.value))}
                placeholder="10"
                min={5}
              />
            </div>
            <Button size="icon" variant="ghost" className="mt-4 h-9 w-9 shrink-0" onClick={() => removeRule(idx)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Rounding Config */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">Konfigurasi Pembulatan</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Metode Pembulatan</label>
            <Select value={rounding.rule} onValueChange={v => setRounding(r => ({ ...r, rule: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROUNDING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min Markup %</label>
            <Input
              type="number"
              value={rounding.min_markup}
              onChange={e => setRounding(r => ({ ...r, min_markup: Number(e.target.value) }))}
              min={1}
            />
          </div>
        </div>
      </div>

      <Button onClick={saveAll} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
      </Button>
    </div>
  );
}
