import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import api from '../utils/api';

const GokwikCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const { orderId, checkoutUrl } = location.state || {};
    
    if (!orderId || !checkoutUrl) {
      toast.error('Invalid checkout session');
      navigate('/cart');
      return;
    }

    // Redirect to Gokwik checkout page
    window.location.href = checkoutUrl;
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-amber-950 mb-2">
          Redirecting to Payment Gateway...
        </h2>
        <p className="text-amber-700">
          Please do not refresh the page
        </p>
      </div>
    </div>
  );
};

export default GokwikCheckout;