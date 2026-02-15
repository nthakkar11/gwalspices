import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Trash2, Plus, Minus, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State management
  const [couponCode, setCouponCode] = useState('');
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  // Fetch active coupons on mount
  useEffect(() => {
    fetchActiveCoupons();
  }, []);

  // Validate cart items on load and when cart changes
  useEffect(() => {
    if (cart && cart.length > 0) {
      validateCartItems();
    }
  }, [cart]);

  // Fetch pricing when cart changes
  useEffect(() => {
    if (cart && cart.length > 0) {
      fetchPricing();
    } else {
      setPricing(null);
    }
  }, [cart]);

  // ========================================
  // VALIDATE CART ITEMS WITH BACKEND
  // ========================================
  const validateCartItems = async () => {
    if (!cart || cart.length === 0 || validating) return;

    try {
      setValidating(true);
      const response = await api.post('/cart/validate', {
        items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        }))
      });

      if (response.data.invalid_items && response.data.invalid_items.length > 0) {
        // Remove invalid items from cart
        response.data.invalid_items.forEach(item => {
          removeFromCart(item.variant_id);
        });
        
        toast.error('Some items in your cart are no longer available and have been removed');
      }
    } catch (error) {
      console.error('Failed to validate cart:', error);
      // Don't show error toast - fail silently
    } finally {
      setValidating(false);
    }
  };

  // ========================================
  // FETCH ACTIVE COUPONS
  // ========================================
  const fetchActiveCoupons = async () => {
    try {
      const response = await api.get('/coupons/active');
      setActiveCoupons(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setActiveCoupons([]);
    }
  };

  // ========================================
  // FETCH PRICING FROM BACKEND
  // ========================================
  const fetchPricing = useCallback(async (code = null) => {
    if (!cart || cart.length === 0) {
      setPricing(null);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const couponToSend = code === null 
        ? null 
        : (code || couponCode || null);
      
      const response = await api.post('/checkout/preview', {
        cart_items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        coupon_code: couponToSend,
        payment_method: null
      });

      setPricing(response.data);
      
      if (response.data.coupon) {
        setCouponSuccess(`Coupon ${response.data.coupon.code} applied!`);
        setCouponError('');
        setCouponCode(response.data.coupon.code);
      } else {
        setCouponSuccess('');
        setCouponError('');
        if (code === null) {
          setCouponCode('');
        }
      }

    } catch (error) {
      console.error('Pricing calculation error:', error);
      
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.detail || 'Invalid request';
        setCouponError(errorMsg);
        toast.error(errorMsg);
      } else if (error.response?.status === 500) {
        setError('Unable to calculate pricing. Please try again.');
        toast.error('Server error. Please try again.');
      } else {
        setError('Failed to connect to server. Please check your connection.');
        toast.error('Connection error');
      }
      
      setPricing(null);
      setCouponSuccess('');
    } finally {
      setLoading(false);
      setApplyingCoupon(false);
    }
  }, [cart, couponCode]);

  // ========================================
  // APPLY COUPON
  // ========================================
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    
    await fetchPricing(couponCode);
  };

  // ========================================
  // REMOVE COUPON
  // ========================================
  const handleRemoveCoupon = async () => {
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
    setApplyingCoupon(false);
    
    setPricing(prev => {
      if (prev) {
        return {
          ...prev,
          discount: 0,
          coupon: null,
          grand_total: prev.subtotal + (prev.charges?.shipping || 0)
        };
      }
      return null;
    });

    try {
      await fetchPricing(null);
      toast.success('Coupon removed');
    } catch (error) {
      console.error('Error removing coupon:', error);
      toast.error('Failed to remove coupon');
      await fetchPricing();
    }
  };

  // ========================================
  // CONTINUE TO REVIEW
  // ========================================
  const handleContinue = () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }
    
    if (!pricing) {
      toast.error('Unable to calculate pricing');
      return;
    }
    
    // Pass coupon data to review page
    navigate('/review', { 
      state: { 
        appliedCoupon: pricing.coupon,
        discount: pricing.discount
      } 
    });
  };

  // ========================================
  // GET COUPON SUGGESTIONS
  // ========================================
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

  // ========================================
  // EMPTY CART STATE
  // ========================================
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-amber-950 mb-4">
            Your cart is empty
          </h2>
          <p className="text-amber-700 mb-6">
            Looks like you haven't added anything to your cart yet
          </p>
          <Link to="/shop">
            <Button className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-6 text-lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-amber-950 mb-8">
          Your Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ========== CART ITEMS ========== */}
          <div className="lg:col-span-2 space-y-4">
            {validating && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-sm text-amber-700">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                  <span>Validating your cart...</span>
                </div>
              </div>
            )}
            
            {cart.map((item) => {
              // Skip rendering if item is invalid
              if (!item || !item.variant_id || !item.product_name) {
                return null;
              }
              
              const discountPercent = item.mrp > item.price
                ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
                : 0;

              return (
                <div
                  key={item.variant_id}
                  className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-6">
                    <img
                      src={item.image || '/placeholder-image.png'}
                      alt={item.product_name}
                      className="w-28 h-28 object-cover rounded-xl border border-amber-100"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.png';
                      }}
                    />

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-amber-950">
                        {item.product_name}
                      </h3>

                      <p className="text-sm text-amber-700 mb-3">
                        Size: {item.variant_size || 'Standard'}
                      </p>

                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-amber-950">
                          ₹{item.price}
                        </span>

                        {discountPercent > 0 && (
                          <>
                            <span className="line-through text-amber-600">
                              ₹{item.mrp}
                            </span>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {discountPercent}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.variant_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-4 border border-amber-200 rounded-xl px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="hover:bg-amber-50"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <span className="font-semibold text-amber-950 w-6 text-center">
                          {item.quantity}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                          className="hover:bg-amber-50"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========== ORDER SUMMARY ========== */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 sticky top-24 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-950 mb-6">
                Order Summary
              </h2>

              {/* ERROR STATE */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Unable to calculate pricing</p>
                      <p className="text-xs text-red-600 mt-1">{error}</p>
                      <Button
                        onClick={() => fetchPricing()}
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {loading && !pricing && !error && (
                <div className="py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent"></div>
                  <p className="text-sm text-amber-700 mt-2">Calculating...</p>
                </div>
              )}

              {/* PRICING DISPLAY */}
              {pricing && !error && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Subtotal</span>
                    <span className="font-medium text-amber-950">
                      ₹{pricing.subtotal?.toFixed(2)}
                    </span>
                  </div>

                  {/* COUPON DISCOUNT */}
                  {pricing.discount > 0 && pricing.coupon && (
                    <div className="flex justify-between text-green-600">
                      <div className="flex items-center gap-1">
                        <span>Coupon Discount</span>
                        <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full font-medium">
                          {pricing.coupon.code}
                        </span>
                      </div>
                      <span>-₹{pricing.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-amber-700">Delivery Fee</span>
                    <span className="font-medium text-amber-950">
                      {pricing.charges?.shipping === 0
                        ? <span className="text-green-600 font-semibold">FREE</span>
                        : `₹${pricing.charges?.shipping?.toFixed(2)}`}
                    </span>
                  </div>

                  {/* FREE SHIPPING PROGRESS */}
                  {pricing.progress?.remaining_for_free_shipping > 0 && (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-700">
                        Add ₹{pricing.progress.remaining_for_free_shipping.toFixed(0)} more for 
                        <span className="font-semibold text-green-600"> FREE delivery</span>
                      </p>
                    </div>
                  )}

                  {/* TOTAL SAVINGS */}
                  {pricing.discount > 0 && pricing.coupon && (
                    <div className="bg-green-50 p-3 rounded-lg mt-2">
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        You saved ₹{pricing.discount.toFixed(2)} with coupon
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-semibold text-amber-950">
                      <span>Total</span>
                      <span>₹{pricing.grand_total?.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Inclusive of all taxes
                  </p>
                </div>
              )}

              {/* COUPON SECTION */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-amber-950 mb-2">
                  Have a coupon?
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                        setCouponSuccess('');
                      }}
                      className={`w-full ${
                        couponError 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : pricing?.coupon
                            ? 'border-green-300 bg-green-50 focus:border-green-500'
                            : 'border-amber-200'
                      }`}
                      disabled={applyingCoupon || loading || !!pricing?.coupon}
                    />
                    {couponCode && !pricing?.coupon && (
                      <button
                        onClick={() => {
                          setCouponCode('');
                          setCouponError('');
                          setCouponSuccess('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        type="button"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {pricing?.coupon ? (
                    <Button
                      onClick={handleRemoveCoupon}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap"
                      disabled={applyingCoupon || loading}
                    >
                      {applyingCoupon ? 'Removing...' : 'Remove'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={!couponCode || applyingCoupon || loading}
                      className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply'}
                    </Button>
                  )}
                </div>

                {/* COUPON ERROR MESSAGE */}
                {couponError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-start gap-1">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{couponError}</span>
                  </div>
                )}

                {/* COUPON SUCCESS MESSAGE */}
                {couponSuccess && !couponError && pricing?.coupon && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg flex items-start gap-1">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{couponSuccess}</span>
                  </div>
                )}
              </div>

              {/* COUPON SUGGESTIONS */}
              {!pricing?.coupon && activeCoupons.length > 0 && pricing && !error && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-amber-700">Available offers:</p>
                  
                  {getCouponSuggestions().map((coupon) => (
                    <div 
                      key={coupon.code}
                      className={`p-3 rounded-lg border ${
                        coupon.eligible 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-amber-50 border-amber-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono px-2 py-1 rounded ${
                            coupon.eligible 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-amber-200 text-amber-800'
                          }`}>
                            {coupon.code}
                          </span>
                          <span className="text-xs font-medium text-amber-900">
                            {coupon.discount}
                          </span>
                        </div>
                        
                        {coupon.eligible ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Eligible
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">
                            Add ₹{coupon.remaining} more
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-amber-700 mt-1">
                        {coupon.description}
                      </p>
                      
                      {coupon.eligible && !pricing?.coupon && (
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

              {/* CONTINUE BUTTON */}
              <Button
                onClick={handleContinue}
                disabled={!cart || cart.length === 0 || !pricing || !!error || validating}
                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-5 rounded-xl font-semibold disabled:opacity-50"
              >
                {validating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Validating...</span>
                  </div>
                ) : (
                  'Continue to Review →'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;