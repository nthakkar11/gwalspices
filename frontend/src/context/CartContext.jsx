import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    if (!isAuthenticated) return;

    try {
      const res = await api.get('/cart');
      setCart(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [isAuthenticated]);

  const addToCart = async (variantId, productId, quantity = 1) => {
    try {
      await api.post('/cart/add', {
        variant_id: variantId,
        product_id: productId,
        quantity
      });

      await loadCart();
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const removeFromCart = async (variantId) => {
    await api.delete(`/cart/remove/${variantId}`);
    await loadCart();
  };

  const updateQuantity = async (variantId, quantity) => {
    await api.put('/cart/update', {
      variant_id: variantId,
      quantity
    });
    await loadCart();
  };

  const clearCart = async () => {
    await api.delete('/cart');
    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
