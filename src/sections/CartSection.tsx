import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/appStore';
import { Link } from 'react-router-dom';

export function CartSection() {
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    toggleItemSelection,
    selectAllItems,
    clearCart,
  } = useAppStore();
  const [selectAll, setSelectAll] = useState(true);

  const selectedItems = cart.filter(item => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    selectAllItems(checked);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-muted text-muted-foreground">
          <ShoppingBag className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-primary">Keranjang Kosong</h2>
        <p className="text-sm mt-1 mb-6 text-muted-foreground max-w-sm">
          Keranjang belanja Anda masih kosong. Yuk, jelajahi layanan profesional kami!
        </p>
        <Link to="/">
          <Button className="bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm px-6">
            Jelajahi Layanan
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-primary">Keranjang Belanja</h1>
        <button 
          onClick={clearCart}
          className="text-destructive text-xs font-semibold hover:underline"
        >
          Hapus Semua
        </button>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-card border border-border">
        <Checkbox 
          checked={selectAll} 
          onCheckedChange={handleSelectAll}
          id="select-all"
        />
        <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer text-primary">
          Pilih Semua ({cart.length} item)
        </label>
      </div>

      {/* Cart Items */}
      <div className="space-y-3">
        {cart.map((item, index) => (
          <Card 
            key={item.id} 
            className={`overflow-hidden transition-all bg-card border-border shadow-soft ${item.selected ? 'border-primary' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <Checkbox 
                  checked={item.selected}
                  onCheckedChange={() => toggleItemSelection(index)}
                />
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-xl bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate text-primary">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">Paket {item.tier}</p>
                  <p className="font-bold text-sm mt-1 text-primary">
                    Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                  </p>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-primary">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFromCart(index)}
                  className="self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-card shadow-soft-lg p-4 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total ({selectedCount} item)</p>
              <p className="text-xl font-bold text-primary">
                Rp {subtotal.toLocaleString('id-ID')}
              </p>
            </div>
            <Link to="/checkout" className="flex-1 max-w-xs">
              <Button 
                className="w-full h-12 bg-primary hover:bg-secondary text-primary-foreground font-semibold shadow-sm transition-colors"
              >
                Checkout
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartSection;
