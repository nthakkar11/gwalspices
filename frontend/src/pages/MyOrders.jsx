import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my-orders');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_payment': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Payment' },
      'processing': { color: 'bg-blue-100 text-blue-800', icon: Package, label: 'Processing' },
      'shipped': { color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'Shipped' },
      'out_for_delivery': { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Out for Delivery' },
      'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig['pending_payment'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getTrackingStatus = (order) => {
    if (order.tracking_number) {
      return (
        <div className="mt-2 p-3 bg-amber-50 rounded-lg">
          <p className="text-xs font-medium text-amber-900">Tracking Information</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-amber-700">{order.courier_name}:</span>
            <span className="text-xs font-mono font-medium text-amber-900">{order.tracking_number}</span>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 hover:text-amber-700 underline"
              >
                Track
              </a>
            )}
          </div>
          {order.estimated_delivery && (
            <p className="text-xs text-amber-600 mt-1">
              Estimated Delivery: {new Date(order.estimated_delivery).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-700">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-amber-950 mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-12 text-center">
            <Package className="h-16 w-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-amber-950 mb-2">No orders yet</h2>
            <p className="text-amber-700 mb-6">
              Looks like you haven't placed any orders yet
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-amber-100">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-amber-600">Order #</span>
                      <span className="font-mono font-bold text-amber-950">
                        {order.order_number}
                      </span>
                      {getStatusBadge(order.order_status)}
                    </div>
                    <p className="text-xs text-amber-600">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-600">Total Amount</p>
                    <p className="text-2xl font-bold text-amber-600">
                      ₹{order.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.variant_id} className="flex gap-4">
                      <img
                        src={item.product_image || '/placeholder.png'}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-lg border border-amber-100"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-amber-950">
                          {item.product_name}
                        </h3>
                        <p className="text-xs text-amber-700">Size: {item.variant_size}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-sm text-amber-900">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-semibold text-amber-950">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking Info */}
                {getTrackingStatus(order)}

                {/* Delivery Address */}
                <div className="mt-4 pt-4 border-t border-amber-100">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">{order.shipping_address.name}</p>
                      <p className="text-amber-700">
                        {order.shipping_address.address_line1}
                        {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
                      </p>
                      <p className="text-amber-700">
                        {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                      </p>
                      <p className="text-amber-700">Phone: {order.shipping_address.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-amber-100 flex justify-end gap-3">
                  {order.invoice_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(order.invoice_url, '_blank')}
                      className="border-amber-300 text-amber-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate(`/order-tracking/${order.order_number}`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    Track Order
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;