import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Home,
  ChevronRight,
  Download,
  ShoppingBag,
  IndianRupee
} from 'lucide-react';
import api from '../utils/api';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    // Auto redirect to orders page after 10 seconds
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/account/orders');
    }
  }, [countdown, navigate]);

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

  const handleDownloadInvoice = async () => {
    if (order?.invoice_url) {
      window.open(order.invoice_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-700">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-amber-950 mb-2">
            Order Confirmed! 🎉
          </h1>
          <p className="text-lg text-amber-700">
            Thank you for shopping with GWAL SPICES
          </p>
        </div>

        {/* Order Card */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-amber-100">
            <div>
              <p className="text-sm text-amber-600">Order Number</p>
              <p className="text-lg font-mono font-bold text-amber-950">
                {order?.order_number}
              </p>
            </div>
            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              Payment Successful
            </span>
          </div>

          {/* Order Status Timeline */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-950">Order Status</h3>
            </div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs mt-1 text-amber-900 font-medium">Confirmed</span>
                </div>
                <div className="flex-1 h-1 bg-green-200"></div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-amber-700" />
                  </div>
                  <span className="text-xs mt-1 text-amber-600">Processing</span>
                </div>
                <div className="flex-1 h-1 bg-amber-200"></div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                    <Truck className="h-4 w-4 text-amber-700" />
                  </div>
                  <span className="text-xs mt-1 text-amber-600">Shipped</span>
                </div>
                <div className="flex-1 h-1 bg-amber-200"></div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                    <Home className="h-4 w-4 text-amber-700" />
                  </div>
                  <span className="text-xs mt-1 text-amber-600">Delivered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-4">
            <h3 className="font-semibold text-amber-950 mb-3">Order Summary</h3>
            <div className="bg-amber-50 p-4 rounded-xl">
              <div className="flex justify-between mb-2">
                <span className="text-amber-700">Subtotal</span>
                <span className="font-medium text-amber-950">₹{order?.subtotal?.toFixed(2)}</span>
              </div>
              {order?.discount > 0 && (
                <div className="flex justify-between mb-2 text-green-600">
                  <span>Discount</span>
                  <span>-₹{order?.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-amber-700">Shipping</span>
                <span className="font-medium text-amber-950">
                  {order?.shipping_fee === 0 ? 'FREE' : `₹${order?.shipping_fee?.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span className="text-amber-950">Total</span>
                <span className="text-amber-600">₹{order?.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="mb-4">
            <h3 className="font-semibold text-amber-950 mb-2">Delivery Address</h3>
            <div className="text-sm text-amber-800">
              <p className="font-medium">{order?.shipping_address?.name}</p>
              <p>{order?.shipping_address?.address_line1}</p>
              {order?.shipping_address?.address_line2 && (
                <p>{order?.shipping_address?.address_line2}</p>
              )}
              <p>{order?.shipping_address?.city}, {order?.shipping_address?.state} - {order?.shipping_address?.pincode}</p>
              <p className="mt-1">📞 {order?.shipping_address?.phone}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {order?.invoice_url && (
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            )}
            <Link to="/account/orders" className="flex-1">
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <ShoppingBag className="h-4 w-4 mr-2" />
                View My Orders
              </Button>
            </Link>
          </div>
        </div>

        {/* Redirect Message */}
        <div className="text-center text-sm text-amber-600">
          <p>
            Redirecting to your orders in {countdown} seconds...
          </p>
          <Link to="/shop" className="text-amber-700 hover:text-amber-800 font-medium underline mt-2 inline-block">
            Continue Shopping
          </Link>
        </div>

        {/* Order Confirmation Email */}
        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            We've sent a confirmation email to your registered email address with all the details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;