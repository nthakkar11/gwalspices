import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ Added useLocation
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  MapPin, 
  Plus, 
  CreditCard, 
  Wallet,
  CheckCircle,
  IndianRupee,
  Home,
  ChevronRight,
  Shield,
  Package,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

const Review = () => {
  const { cart, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth(); // ✅ Get auth loading state
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Add useLocation

  // State management
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('PREPAID');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeCoupons, setActiveCoupons] = useState([]); // ✅ For coupon suggestions
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

  // ============================
  // GET COUPON FROM NAVIGATION STATE
  // ============================
  useEffect(() => {
    if (location.state?.appliedCoupon) {
      setAppliedCoupon(location.state.appliedCoupon);
    }
  }, [location.state]);

  // ============================
  // FETCH ACTIVE COUPONS FOR SUGGESTIONS
  // ============================
  useEffect(() => {
    fetchActiveCoupons();
  }, []);

  const fetchActiveCoupons = async () => {
    try {
      const response = await api.get('/coupons/active');
      setActiveCoupons(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setActiveCoupons([]);
    }
  };

  // ============================
  // INITIAL FETCH - WITH AUTH LOADING CHECK
  // ============================
  useEffect(() => {
    // ✅ Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }
    if (!cart || cart.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }
    fetchUserData();
    fetchSettings();
  }, [user, cart, authLoading, navigate]);

  // ============================
  // FETCH PRICING WHEN CART, PAYMENT METHOD, OR COUPON CHANGES
  // ============================
  useEffect(() => {
    if (cart && cart.length > 0) {
      fetchPricing();
    }
  }, [cart, paymentMethod, appliedCoupon]);

  // ============================
  // API CALLS
  // ============================
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
      toast.error('Failed to load address details');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings({
        cod_enabled: true
      });
    }
  };

  const fetchPricing = async () => {
    if (!cart || cart.length === 0) return;

    try {
      setLoading(true);
      const response = await api.post('/checkout/preview', {
        cart_items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        coupon_code: appliedCoupon?.code || null,
        payment_method: paymentMethod
      });
      setPricing(response.data);
    } catch (error) {
      console.error('Pricing calculation failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to calculate pricing');
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // ADDRESS MANAGEMENT
  // ============================
  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.address_line1 || 
        !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!/^\d{10}$/.test(newAddress.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!/^\d{6}$/.test(newAddress.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    try {
      setLoading(true);
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
      toast.error(error.response?.data?.detail || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await api.delete(`/auth/addresses/${addressId}`);
      toast.success('Address deleted successfully');
      fetchUserData();
      if (selectedAddress?.id === addressId) {
        setSelectedAddress(null);
      }
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await api.put(`/auth/addresses/${addressId}/default`);
      toast.success('Default address updated');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  // ============================
  // COUPON MANAGEMENT
  // ============================
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/coupons/validate', {
        code: couponCode,
        cart_subtotal: pricing?.subtotal || 0
      });

      if (response.data.valid) {
        setAppliedCoupon({
          code: couponCode.toUpperCase(),
          discount: response.data.discount
        });
        toast.success(`Coupon ${couponCode.toUpperCase()} applied!`);
        setCouponCode('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid coupon code');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed');
  };

  // ============================
  // COUPON SUGGESTIONS
  // ============================
  const getCouponSuggestions = () => {
    if (!activeCoupons.length || !pricing) return [];
    
    const subtotal = pricing.subtotal || 0;
    
    return activeCoupons
      .filter(coupon => coupon.min_order_amount > 0)
      .map(coupon => ({
        code: coupon.code,
        discount: coupon.type === 'percentage' 
          ? `${coupon.value}% OFF` 
          : `₹${coupon.value} OFF`,
        minOrder: coupon.min_order_amount,
        description: coupon.description || 
          `${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} off on orders above ₹${coupon.min_order_amount}`,
        eligible: subtotal >= coupon.min_order_amount,
        remaining: Math.max(0, coupon.min_order_amount - subtotal)
      }))
      .slice(0, 2);
  };

  // ============================
  // ORDER PLACEMENT
  // ============================
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (paymentMethod === 'COD' && !settings.cod_enabled) {
      toast.error('Cash on Delivery is currently unavailable');
      return;
    }

    setProcessing(true);

    try {
      const response = await api.post('/orders/initiate', {
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code || null
      });

      const { order_id, checkout_url } = response.data;

      if (paymentMethod === 'COD') {
        toast.success('Order placed successfully!');
        clearCart();
        navigate(`/order-success/${order_id}`);
      } else {
        if (!checkout_url) {
          toast.error('Payment checkout URL is missing.');
          navigate(`/payment-failed/${order_id}`);
          return;
        }

        clearCart();
        navigate('/gokwik-checkout', {
          state: {
            orderId: order_id,
            checkoutUrl: checkout_url,
          },
        });
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  // ============================
  // LOADING STATE
  // ============================
  if (authLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-700">Loading your account...</p>
        </div>
      </div>
    );
  }

  // ============================
  // EMPTY CART STATE
  // ============================
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-950 mb-2">
            Your cart is empty
          </h2>
          <p className="text-amber-700 mb-6">
            Add some products to your cart before checkout
          </p>
          <Button
            onClick={() => navigate('/shop')}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  // ============================
  // MAIN RENDER
  // ============================
  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-950">
            Review Order
          </h1>
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-4 py-2 rounded-full">
            <Clock className="h-4 w-4" />
            <span>Complete your purchase</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN - Address & Payment */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ========== DELIVERY ADDRESS ========== */}
            <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  <h2 className="text-xl font-semibold text-amber-950">
                    Delivery Address
                  </h2>
                </div>
                {addresses.length > 0 && (
                  <Button
                    onClick={() => setShowNewAddress(!showNewAddress)}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                )}
              </div>

              {/* Address List */}
              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddress?.id === addr.id
                          ? 'border-amber-600 bg-amber-50'
                          : 'border-amber-200 hover:border-amber-400'
                      }`}
                      onClick={() => setSelectedAddress(addr)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedAddress?.id === addr.id
                              ? 'border-amber-600 bg-amber-600'
                              : 'border-amber-300'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-amber-950">
                              {addr.name}
                            </span>
                            {addr.is_default && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-amber-800">
                            {addr.address_line1}
                            {addr.address_line2 && `, ${addr.address_line2}`}
                          </p>
                          <p className="text-sm text-amber-800">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            📞 {addr.phone}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!addr.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefaultAddress(addr.id);
                              }}
                              className="text-xs text-amber-600 hover:text-amber-700"
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(addr.id);
                            }}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-amber-50 rounded-xl">
                  <MapPin className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-amber-700 mb-2">No addresses saved yet</p>
                  <Button
                    onClick={() => setShowNewAddress(true)}
                    variant="outline"
                    className="border-amber-600 text-amber-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New Address
                  </Button>
                </div>
              )}

              {/* Add New Address Form */}
              {showNewAddress && (
                <div className="mt-6 p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                  <h3 className="font-semibold text-amber-950 mb-4 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Add New Address
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-amber-900">Full Name *</Label>
                      <Input
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label className="text-amber-900">Phone Number *</Label>
                      <Input
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-amber-900">Address Line 1 *</Label>
                      <Input
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="House/Flat No., Building, Street"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-amber-900">Address Line 2</Label>
                      <Input
                        value={newAddress.address_line2}
                        onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="Landmark, Area (Optional)"
                      />
                    </div>
                    <div>
                      <Label className="text-amber-900">City *</Label>
                      <Input
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="Mumbai"
                      />
                    </div>
                    <div>
                      <Label className="text-amber-900">State *</Label>
                      <Input
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="Maharashtra"
                      />
                    </div>
                    <div>
                      <Label className="text-amber-900">Pincode *</Label>
                      <Input
                        value={newAddress.pincode}
                        onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                        className="mt-1 bg-white border-amber-200"
                        placeholder="400001"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={newAddress.is_default}
                        onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                        className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                      />
                      <Label htmlFor="is_default" className="text-sm text-amber-700">
                        Set as default address
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleAddAddress}
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {loading ? 'Saving...' : 'Save Address'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewAddress(false)}
                      className="border-amber-300 text-amber-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ========== PAYMENT METHOD ========== */}
            <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-semibold text-amber-950">
                  Payment Method
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* PREPAID */}
                <div
                  onClick={() => setPaymentMethod('PREPAID')}
                  className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'PREPAID'
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'PREPAID'
                          ? 'border-amber-600 bg-amber-600'
                          : 'border-amber-300'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-5 w-5 text-amber-700" />
                        <span className="font-semibold text-amber-950">
                          Pay Online
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-amber-700">
                        Credit Card, Debit Card, Net Banking, UPI, Wallet
                      </p>
                      {pricing?.discounts?.prepaid_discount > 0 && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Save ₹{pricing.discounts.prepaid_discount.toFixed(2)} with prepaid
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* COD */}
                {settings.cod_enabled && (
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'COD'
                        ? 'border-amber-600 bg-amber-50'
                        : 'border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          paymentMethod === 'COD'
                            ? 'border-amber-600 bg-amber-600'
                            : 'border-amber-300'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="h-5 w-5 text-amber-700" />
                          <span className="font-semibold text-amber-950">
                            Cash on Delivery
                          </span>
                        </div>
                        <p className="text-sm text-amber-700">
                          Pay with cash when you receive your order
                        </p>
                        {pricing?.charges?.cod_fee > 0 && (
                          <p className="text-xs text-amber-600 mt-2">
                            + ₹{pricing.charges.cod_fee.toFixed(2)} COD charges apply
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Secure Payment Badge */}
              <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Your payment information is secure. We never store your card details.</span>
              </div>
            </div>

            {/* Order Items Summary - Mobile Only */}
            <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm lg:hidden">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-semibold text-amber-950">
                  Order Items
                </h2>
              </div>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.variant_id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg border border-amber-100"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-amber-950">{item.product_name}</p>
                      <p className="text-xs text-amber-700">Size: {item.variant_size}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-amber-900">x{item.quantity}</span>
                        <span className="font-semibold text-amber-950">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 sticky top-24 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-950 mb-6 flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-amber-600" />
                Order Summary
              </h2>

              {loading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm text-amber-700">Calculating...</p>
                </div>
              ) : pricing ? (
                <>
                  {/* Price Breakdown */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Subtotal</span>
                      <span className="font-medium text-amber-950">
                        ₹{pricing.subtotal?.toFixed(2)}
                      </span>
                    </div>

                    {/* Coupon Discount */}
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <div className="flex items-center gap-1">
                          <span>Coupon Discount</span>
                          <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full">
                            {pricing.coupon?.code}
                          </span>
                        </div>
                        <span>-₹{pricing.discount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Prepaid Discount */}
                    {paymentMethod === 'PREPAID' && pricing.discounts?.prepaid_discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Prepaid Discount</span>
                        <span>-₹{pricing.discounts.prepaid_discount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Shipping */}
                    <div className="flex justify-between">
                      <span className="text-amber-700">Shipping</span>
                      <span className="font-medium text-amber-950">
                        {pricing.charges?.shipping === 0 ? (
                          <span className="text-green-600 font-semibold">FREE</span>
                        ) : (
                          `₹${pricing.charges?.shipping?.toFixed(2)}`
                        )}
                      </span>
                    </div>

                    {/* COD Fee */}
                    {paymentMethod === 'COD' && pricing.charges?.cod_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">COD Charges</span>
                        <span className="font-medium text-amber-950">
                          +₹{pricing.charges.cod_fee.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Free Shipping Progress */}
                    {pricing.progress?.remaining_for_free_shipping > 0 && (
                      <div className="bg-amber-50 p-3 rounded-lg mt-2">
                        <p className="text-xs text-amber-700">
                          Add ₹{pricing.progress.remaining_for_free_shipping.toFixed(0)} more for
                          <span className="font-semibold text-green-600"> FREE delivery</span>
                        </p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-amber-950">Total</span>
                        <span className="text-amber-600">
                          ₹{pricing.grand_total?.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Inclusive of all taxes
                      </p>
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="mt-6 pt-6 border-t">
                    {!appliedCoupon ? (
                      <div>
                        <Label className="text-sm font-medium text-amber-950 mb-2 block">
                          Have a coupon?
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1 border-amber-200"
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            disabled={!couponCode || loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                          >
                            Apply
                          </Button>
                        </div>

                        {/* ✅ COUPON SUGGESTIONS */}
                        {!appliedCoupon && activeCoupons.length > 0 && pricing && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-medium text-amber-700">Available offers:</p>
                            {getCouponSuggestions().map((coupon) => (
                              <div 
                                key={coupon.code}
                                className={`p-2 rounded-lg border ${
                                  coupon.eligible 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-amber-50 border-amber-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                                      {coupon.code}
                                    </span>
                                    <span className="text-xs font-medium text-amber-900">
                                      {coupon.discount}
                                    </span>
                                  </div>
                                  {coupon.eligible ? (
                                    <span className="text-xs text-green-600">Eligible</span>
                                  ) : (
                                    <span className="text-xs text-amber-600">
                                      Add ₹{coupon.remaining} more
                                    </span>
                                  )}
                                </div>
                                {coupon.eligible && !appliedCoupon && (
                                  <Button
                                    onClick={() => {
                                      setCouponCode(coupon.code);
                                      handleApplyCoupon();
                                    }}
                                    size="sm"
                                    className="mt-2 w-full bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs py-1"
                                  >
                                    Apply {coupon.code}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <span className="font-mono font-semibold text-green-700">
                                {appliedCoupon.code}
                              </span>
                              <p className="text-xs text-green-600 mt-0.5">
                                Discount: -₹{pricing.discount?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCoupon}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Place Order Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={!selectedAddress || processing || loading}
                    className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-6 text-lg font-semibold disabled:opacity-50"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Place Order</span>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    )}
                  </Button>

                  {/* Order Guarantee */}
                  <div className="mt-4 text-center">
                    <p className="text-xs text-amber-700 flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3" />
                      Safe and secure checkout
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      By placing this order, you agree to our{' '}
                      <a href="/terms" className="text-amber-600 hover:underline">Terms of Service</a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-amber-600 hover:underline">Privacy Policy</a>
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-amber-600">
                  Unable to calculate pricing
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;