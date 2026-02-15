import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../utils/api';
import useRazorpay from 'react-razorpay';

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [Razorpay] = useRazorpay();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [settings, setSettings] = useState({});
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserData();
    fetchSettings();
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setAddresses(response.data.addresses || []);
      if (response.data.addresses && response.data.addresses.length > 0) {
        const defaultAddr = response.data.addresses.find(a => a.is_default);
        setSelectedAddress(defaultAddr || response.data.addresses[0]);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleAddAddress = async () => {
    try {
      await api.post('/auth/addresses', newAddress);
      toast.success('Address added successfully');
      fetchUserData();
      setShowNewAddress(false);
      setNewAddress({
        name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
      });
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const subtotal = getCartTotal();
  const shippingFee = subtotal >= (settings.free_shipping_threshold || 999) ? 0 : (settings.shipping_fee || 40);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = subtotal - discount + shippingFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (subtotal < (settings.min_order_value || 599)) {
      toast.error(`Minimum order value is ₹${settings.min_order_value || 599}`);
      return;
    }

    setProcessing(true);

    try {
      const orderData = {
        items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        address_id: selectedAddress.id,
        coupon_code: appliedCoupon?.code || null
      };

      const response = await api.post('/orders/create', orderData);
      const { razorpay_order_id, amount, order_id } = response.data;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || '',
        amount: amount * 100,
        currency: 'INR',
        order_id: razorpay_order_id,
        name: 'GWAL SPICES',
        description: 'Premium Indian Spices',
        handler: async function (razorpayResponse) {
          try {
            await api.post('/orders/verify-payment', {
              order_id: order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature
            });
            clearCart();
            navigate('/payment-success');
            toast.success('Order placed successfully!');
          } catch (error) {
            toast.error('Payment verification failed');
            navigate('/payment-failed');
          }
        },
        prefill: {
          name: selectedAddress.name,
          contact: selectedAddress.phone,
        },
        theme: {
          color: '#D97706'
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-amber-950 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border-2 border-amber-200 p-6">
              <h2 className="text-2xl font-bold text-amber-950 mb-4">Delivery Address</h2>
              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddress(addr)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddress?.id === addr.id
                          ? 'border-amber-600 bg-amber-50'
                          : 'border-amber-200 hover:border-amber-400'
                      }`}
                    >
                      <p className="font-bold text-amber-950">{addr.name}</p>
                      <p className="text-sm text-amber-800">{addr.address_line1}, {addr.address_line2}</p>
                      <p className="text-sm text-amber-800">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-sm text-amber-700">Phone: {addr.phone}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Button
                onClick={() => setShowNewAddress(!showNewAddress)}
                variant="outline"
                className="mt-4 w-full border-amber-600 text-amber-900"
              >
                + Add New Address
              </Button>

              {showNewAddress && (
                <div className="mt-4 space-y-4 p-4 bg-amber-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Address Line 1</Label>
                    <Input
                      value={newAddress.address_line1}
                      onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Address Line 2</Label>
                    <Input
                      value={newAddress.address_line2}
                      onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Pincode</Label>
                      <Input
                        value={newAddress.pincode}
                        onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddAddress} className="bg-amber-600 hover:bg-amber-700 w-full">
                    Save Address
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 sticky top-24">
              <h2 className="text-2xl font-bold text-amber-950 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.variant_id} className="flex justify-between text-sm">
                    <span className="text-amber-800">{item.product_name} ({item.variant_size}) x {item.quantity}</span>
                    <span className="font-medium text-amber-950">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t-2 border-amber-100">
                <div className="flex justify-between text-amber-800">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-800">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-amber-950 pt-2 border-t-2 border-amber-200">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={processing || !selectedAddress}
                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-6"
              >
                {processing ? 'Processing...' : 'Place Order'}
              </Button>

              <p className="text-xs text-amber-700 mt-4 text-center">
                NO RETURN POLICY: Due to food safety reasons, we do not accept returns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
