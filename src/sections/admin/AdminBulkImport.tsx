import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import type { Product, Tier } from '@/types/database';
import { toast } from 'sonner';

type ImportRow = Record<string, unknown>;
interface Issue { row: number; field?: string; message: string }

const requiredHeaders = ['id', 'title', 'category', 'base_price'];
const maxFileSize = 5 * 1024 * 1024;
const maxRows = 500;

export function AdminBulkImport() {
  const { products, createProduct, updateProduct, fetchProducts } = useProducts();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const parseWorkbook = async (file: File) => {
    setFileName(file.name);
    setRows([]);
    setIssues([]);
    if (!file.name.toLowerCase().endsWith('.xlsx') || (file.type && file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      toast.error('File harus berformat XLSX');
      return;
    }
    if (file.size === 0 || file.size > maxFileSize) {
      toast.error('Ukuran file harus antara 1 byte dan 5 MB');
      return;
    }
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    } catch {
      toast.error('File XLSX tidak dapat dibaca');
      return;
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) { toast.error('Workbook tidak memiliki sheet'); return; }
    const sourceData = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });
    if (!sourceData.length) { toast.error('Sheet tidak memiliki data'); return; }
    if (sourceData.length > maxRows) { toast.error(`Maksimal ${maxRows} baris per import`); return; }
    const data = sourceData.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])));
    const headers = Object.keys(data[0]).map((header) => header.trim().toLowerCase());
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) {
      setIssues(missing.map((field) => ({ row: 1, field, message: `Header ${field} wajib ada` })));
      return;
    }
    const nextIssues: Issue[] = [];
    const ids = new Set<string>();
    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const id = String(row.id ?? '').trim();
      const title = String(row.title ?? '').trim();
      const category = String(row.category ?? '').trim().toLowerCase();
      const price = Number(row.base_price);
      if (!id) nextIssues.push({ row: rowNumber, field: 'id', message: 'ID wajib diisi' });
      else if (ids.has(id)) nextIssues.push({ row: rowNumber, field: 'id', message: 'ID duplikat dalam file' });
      else ids.add(id);
      if (!title) nextIssues.push({ row: rowNumber, field: 'title', message: 'Title wajib diisi' });
      if (!['installation', 'creative', 'technical'].includes(category)) nextIssues.push({ row: rowNumber, field: 'category', message: 'Category tidak valid' });
      if (!Number.isFinite(price) || price < 0) nextIssues.push({ row: rowNumber, field: 'base_price', message: 'Base price tidak valid' });
      if (row.discount_price !== '' && row.discount_price !== undefined && (!Number.isFinite(Number(row.discount_price)) || Number(row.discount_price) < 0)) nextIssues.push({ row: rowNumber, field: 'discount_price', message: 'Discount price tidak valid' });
      if (row.stock !== '' && row.stock !== undefined && (!Number.isInteger(Number(row.stock)) || Number(row.stock) < 0)) nextIssues.push({ row: rowNumber, field: 'stock', message: 'Stock harus bilangan bulat non-negatif' });
      if (row.tiers && !validTiers(row.tiers)) nextIssues.push({ row: rowNumber, field: 'tiers', message: 'Tier harus berupa JSON tier yang valid' });
    });
    setRows(data);
    setIssues(nextIssues);
  };

  const toProduct = (row: ImportRow): Omit<Product, 'created_at' | 'updated_at'> => ({
    id: String(row.id), title: String(row.title), category: String(row.category).toLowerCase() as Product['category'],
    base_price: Number(row.base_price), discount_price: row.discount_price ? Number(row.discount_price) : undefined,
    stock: Number(row.stock || 0), image: String(row.image || ''), icon: String(row.icon || ''),
    rating: Number(row.rating || 4.5), reviews: Number(row.reviews || 0), duration: String(row.duration || ''),
    description: String(row.description || ''), tags: String(row.tags || '').split('|').filter(Boolean),
    related: String(row.related || '').split('|').filter(Boolean),
    tiers: parseTiers(row.tiers, Number(row.base_price)),
  });

  const importRows = async () => {
    if (!rows.length || issues.length) { toast.error('Perbaiki validasi sebelum import'); return; }
    setIsImporting(true);
    try {
      for (const row of rows) {
        const product = toProduct(row);
        const existing = products.find((item) => item.id === product.id);
        if (existing) await updateProduct(product.id, product);
        else await createProduct(product);
      }
      await fetchProducts();
      toast.success(`${rows.length} produk berhasil diimpor ke Supabase`);
      setRows([]);
    } catch (error) {
      toast.error(`Import gagal: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally { setIsImporting(false); }
  };

  return <Card>
    <CardHeader><CardTitle>Import Produk XLSX</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer"><Upload className="h-4 w-4" /><span>Pilih XLSX</span><input type="file" accept=".xlsx" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseWorkbook(file); }} /></label>
      {fileName && <p className="text-sm">{fileName} <Badge variant={issues.length ? 'destructive' : 'secondary'}>{rows.length} baris</Badge></p>}
      {issues.length > 0 && <div className="space-y-1 text-sm text-red-600">{issues.map((issue) => <p key={`${issue.row}-${issue.field}`}><AlertCircle className="inline h-4 w-4" /> Baris {issue.row}: {issue.message}</p>)}</div>}
      {rows.length > 0 && !issues.length && <div className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Preview valid: {rows.length} baris</div>}
      <Button onClick={() => void importRows()} disabled={isImporting || !rows.length || issues.length > 0}><Upload className="h-4 w-4 mr-2" />{isImporting ? 'Mengimpor...' : 'Konfirmasi Import'}</Button>
      {issues.length > 0 && <Button variant="ghost" onClick={() => { setRows([]); setIssues([]); }}><X className="h-4 w-4 mr-2" />Reset</Button>}
    </CardContent>
  </Card>;
}

function parseTiers(value: unknown, fallbackPrice: number): Tier[] {
  if (!value) return [{ name: 'Basic', price: fallbackPrice, features: [] }];
  try { return typeof value === 'string' ? JSON.parse(value) as Tier[] : value as Tier[]; }
  catch { return [{ name: 'Basic', price: fallbackPrice, features: [] }]; }
}

function validTiers(value: unknown): boolean {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every((tier) => {
      if (!tier || typeof tier !== 'object') return false;
      const candidate = tier as Record<string, unknown>;
      return typeof candidate.name === 'string' && candidate.name.trim().length > 0
        && Number.isFinite(Number(candidate.price)) && Number(candidate.price) >= 0
        && Array.isArray(candidate.features) && candidate.features.every((feature) => typeof feature === 'string');
    });
  } catch {
    return false;
  }
}
