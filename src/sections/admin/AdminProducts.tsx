import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProducts } from '@/hooks/useProducts';
import type { Product, Tier } from '@/lib/firebase-db';

const categories = [
  { id: 'installation', label: 'Instalasi' },
  { id: 'creative', label: 'Kreatif' },
  { id: 'technical', label: 'Teknis' },
];

export function AdminProducts() {
  const { products, isLoading, createProduct, updateProduct, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    title: '',
    category: 'installation',
    base_price: 0,
    discount_price: undefined,
    stock: 0,
    image: '',
    icon: '',
    rating: 4.5,
    reviews: 0,
    duration: '',
    description: '',
    tags: [],
    tiers: [{ name: 'Basic', price: 0, features: [] }],
    related: [],
  });

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      category: 'installation',
      base_price: 0,
      discount_price: undefined,
      stock: 0,
      image: '',
      icon: '',
      rating: 4.5,
      reviews: 0,
      duration: '',
      description: '',
      tags: [],
      tiers: [{ name: 'Basic', price: 0, features: [] }],
      related: [],
    });
    setShowProductDialog(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData as Omit<Product, 'id' | 'created_at' | 'updated_at'>);
      }
      setShowProductDialog(false);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [...(formData.tiers || []), { name: 'New Tier', price: 0, features: [] }],
    });
  };

  const updateTier = (index: number, updates: Partial<Tier>) => {
    const newTiers = [...(formData.tiers || [])];
    newTiers[index] = { ...newTiers[index], ...updates };
    setFormData({ ...formData, tiers: newTiers });
  };

  const removeTier = (index: number) => {
    const newTiers = (formData.tiers || []).filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Kelola Produk</h1>
        <Button onClick={handleAddProduct} className="bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari produk..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada produk</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={product.icon}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{product.title}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-blue-600 font-bold">
                        Rp {product.base_price.toLocaleString('id-ID')}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        Stok: {product.stock}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(product.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nama Produk</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nama layanan"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Harga Dasar</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Diskon (Opsional)</Label>
                <Input
                  type="number"
                  value={formData.discount_price || ''}
                  onChange={(e) => setFormData({ ...formData, discount_price: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stok</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Durasi</Label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="Contoh: 2-3 jam"
              />
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded-lg"
                rows={3}
              />
            </div>

            {/* Tiers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Paket/Tier</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTier}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tambah
                </Button>
              </div>
              <div className="space-y-2">
                {formData.tiers?.map((tier, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={tier.name}
                        onChange={(e) => updateTier(index, { name: e.target.value })}
                        placeholder="Nama tier"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={tier.price}
                        onChange={(e) => updateTier(index, { price: Number(e.target.value) })}
                        placeholder="Harga"
                        className="w-24"
                      />
                      <button
                        onClick={() => removeTier(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={tier.features.join(', ')}
                      onChange={(e) => updateTier(index, { features: e.target.value.split(',').map(f => f.trim()) })}
                      placeholder="Fitur (pisahkan dengan koma)"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveProduct} className="w-full bg-blue-600">
              <Check className="h-4 w-4 mr-2" />
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Apakah Anda yakin ingin menghapus produk ini?</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && handleDeleteProduct(showDeleteConfirm)}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
