import { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";

const useCheckoutPricing = (cart, couponCode, paymentMethod) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPricing = async () => {
    if (!cart || cart.length === 0) return;

    try {
      setLoading(true);

      const response = await api.post("/checkout/preview", {
        cart_items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        coupon_code: couponCode || null,
        payment_method: paymentMethod || null
      });

      setPricing(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Pricing failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [cart, couponCode, paymentMethod]);

  return { pricing, loading };
};

export default useCheckoutPricing;
