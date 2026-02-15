import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    if (!isAuthenticated) {
      setCart([]);
      setCartTotal(0);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/cart/');
      setCart(res.data.items || []);
      setCartTotal(res.data.total || 0);
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
        quantity,
      });
      await loadCart();
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed');
      throw err;
    }
  };

  const removeFromCart = async (variantId) => {
    await api.delete(`/cart/remove/${variantId}`);
    await loadCart();
  };

  const updateQuantity = async (variantId, quantity, productId = '') => {
    await api.put('/cart/update', {
      variant_id: variantId,
      product_id: productId,
      quantity,
    });
    await loadCart();
  };

  const clearCart = async () => {
    await api.delete('/cart/');
    setCart([]);
    setCartTotal(0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartTotal,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        reloadCart: loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
