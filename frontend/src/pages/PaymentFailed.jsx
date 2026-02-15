import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  ShoppingCart,
  HelpCircle
} from 'lucide-react';
import api from '../utils/api';

const PaymentFailed = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = () => {
    setRetrying(true);
    // Redirect to checkout with same order
    navigate('/checkout', { state: { orderId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-amber-950 mb-2">
            Payment Failed
          </h1>
          <p className="text-lg text-amber-700">
            We couldn't process your payment
          </p>
        </div>

        {/* Error Card */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm mb-6">
          
          {/* Error Details */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">
                  Payment was unsuccessful
                </h3>
                <p className="text-sm text-red-700">
                  This could be due to insufficient balance, network issues, or bank rejection.
                  Your cart items are still reserved for you.
                </p>
              </div>
            </div>
          </div>

          {/* Order Info */}
          {order && (
            <div className="mb-6">
              <p className="text-sm text-amber-600 mb-2">Order Reference</p>
              <p className="text-lg font-mono font-bold text-amber-950">
                {order.order_number}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg"
            >
              {retrying ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Redirecting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>Retry Payment</span>
                </div>
              )}
            </Button>

            <Link to="/cart">
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 py-6"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Return to Cart
              </Button>
            </Link>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-amber-200">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-950 mb-1">
                  Need assistance?
                </p>
                <p className="text-xs text-amber-700">
                  Contact our support team at{' '}
                  <a href="mailto:support@gwal.com" className="text-amber-600 hover:underline">
                    support@gwal.com
                  </a>
                  {' '}or call{' '}
                  <a href="tel:+919876543210" className="text-amber-600 hover:underline">
                    +91 98765 43210
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Don't worry message */}
        <div className="text-center text-sm text-amber-600">
          <p>
            Don't worry, your cart items are still saved. You can try again or choose a different payment method.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;