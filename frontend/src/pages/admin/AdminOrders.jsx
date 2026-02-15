import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../utils/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    search: '',
    from_date: '',
    to_date: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.payment_status && { payment_status: filters.payment_status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date })
      });

      const response = await api.get(`/admin/orders?${params}`);
      setOrders(response.data.orders || []);
      setPagination((prev) => ({ ...prev, total: (response.data.orders || []).length, pages: 1 }));
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, statusData) => {
    try {
      const statusMap = {
        pending_payment: 'CREATED',
        processing: 'PLACED',
        shipped: 'SHIPPED',
        delivered: 'DELIVERED',
      };
      const normalizedStatus = statusMap[statusData.status] || statusData.order_status || 'PLACED';
      await api.patch(`/admin/orders/${orderId}`, { order_status: normalizedStatus });
      toast.success('Order status updated successfully');
      setShowStatusModal(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_payment': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'processing': { color: 'bg-blue-100 text-blue-800', icon: Package },
      'shipped': { color: 'bg-purple-100 text-purple-800', icon: Truck },
      'out_for_delivery': { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const normalized = (status || '').toLowerCase();
    const config = statusConfig[normalized] || { color: 'bg-gray-100 text-gray-800', icon: Package };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {(status || '').toString().replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-950">Orders</h1>
          <p className="text-amber-700 mt-1">Manage and track customer orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-amber-900 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <Input
                placeholder="Order #, Customer, Email"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10 border-amber-200"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-amber-900 mb-1 block">Order Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white"
            >
              <option value="">All Status</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-amber-900 mb-1 block">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({...filters, payment_status: e.target.value})}
              className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={fetchOrders}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Order #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Items</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-amber-600">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-amber-600">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-amber-50/50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-amber-900">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-amber-700">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-amber-900">{order.user_name}</p>
                        <p className="text-xs text-amber-600">{order.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-amber-700">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-amber-900">
                        ₹{order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        order.payment_status === 'success' ? 'bg-green-100 text-green-800' :
                        order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowStatusModal(true);
                          }}
                          className="border-amber-300 text-amber-700"
                        >
                          Update Status
                        </Button>
                        {order.invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(order.invoice_url, '_blank')}
                            className="text-amber-600"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-amber-200 flex justify-between items-center">
            <p className="text-sm text-amber-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                disabled={pagination.page === 1}
                className="border-amber-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-4 py-2 text-sm text-amber-700">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                disabled={pagination.page === pagination.pages}
                className="border-amber-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <StatusUpdateModal
          order={selectedOrder}
          onClose={() => setShowStatusModal(false)}
          onUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

const StatusUpdateModal = ({ order, onClose, onUpdate }) => {
  const [status, setStatus] = useState(order.order_status);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [courierName, setCourierName] = useState(order.courier_name || '');
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(order.estimated_delivery || '');
  const [cancellationReason, setCancellationReason] = useState(order.cancellation_reason || '');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    const updateData = {
      status,
      ...(trackingNumber && { tracking_number: trackingNumber }),
      ...(courierName && { courier_name: courierName }),
      ...(trackingUrl && { tracking_url: trackingUrl }),
      ...(estimatedDelivery && { estimated_delivery: estimatedDelivery }),
      ...(cancellationReason && { cancellation_reason: cancellationReason }),
      ...(note && { note })
    };
    onUpdate(order.id, updateData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-amber-950">
            Update Order Status - {order.order_number}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">
              Order Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white"
            >
              <option value="pending_payment">Pending Payment</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {status === 'shipped' || status === 'out_for_delivery' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="border-amber-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Courier Name
                </label>
                <Input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., Delhivery, Bluedart, etc."
                  className="border-amber-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Tracking URL
                </label>
                <Input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="border-amber-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Estimated Delivery Date
                </label>
                <Input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="border-amber-200"
                />
              </div>
            </>
          ) : null}

          {status === 'cancelled' && (
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                Cancellation Reason
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Reason for cancellation"
                rows={3}
                className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this status update"
              rows={2}
              className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Update Status
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-amber-300 text-amber-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;