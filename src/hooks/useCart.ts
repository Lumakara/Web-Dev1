import { useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Product } from '@/lib/firebase-db';

export const useCart = () => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleItemSelection,
    selectAllItems,
    clearCart,
    getCartTotal,
    getSelectedItems,
  } = useAppStore();

  const addProductToCart = useCallback((product: Product, tierName: string) => {
    addToCart(product, tierName);
  }, [addToCart]);

  const getCartItemCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const getSelectedCount = useCallback(() => {
    return cart.filter((item) => item.selected).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const isInCart = useCallback((productId: string, tierName: string) => {
    return cart.some((item) => item.productId === productId && item.tier === tierName);
  }, [cart]);

  const getCartItemQuantity = useCallback((productId: string, tierName: string) => {
    const item = cart.find((item) => item.productId === productId && item.tier === tierName);
    return item?.quantity || 0;
  }, [cart]);

  return {
    cart,
    cartCount: getCartItemCount(),
    selectedCount: getSelectedCount(),
    cartTotal: getCartTotal(),
    selectedItems: getSelectedItems(),
    addToCart: addProductToCart,
    removeFromCart,
    updateQuantity,
    toggleItemSelection,
    selectAllItems,
    clearCart,
    isInCart,
    getCartItemQuantity,
  };
};
