import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { Check, Truck, Shield, ShoppingBag } from 'lucide-react';

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${slug}`);
      setProduct(response.data);
      if (response.data.variants.length > 0) {
        setSelectedVariant(response.data.variants[0]);
      }
    } catch (error) {
      toast.error('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addToCart(selectedVariant, product, 1);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50"><p>Loading...</p></div>;
  if (!product) return <div className="min-h-screen pt-24 flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50"><p>Product not found</p><Link to="/shop"><Button>Back to Shop</Button></Link></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden shadow-xl">
            <img
  src={product.image_urls?.[0] || "/placeholder-product.png"}
  alt={product.name}
  className="w-full h-full object-cover"
/>
          </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-5xl font-bold text-amber-950 mb-4">{product.name}</h1>
              <p className="text-lg text-amber-800">{product.description}</p>
            </div>
            {selectedVariant && (
  <div className="flex items-center gap-4">
    <span className="text-4xl font-bold text-amber-950">
      ₹{selectedVariant.selling_price}
    </span>

    {selectedVariant.discount_percent > 0 && (
      <>
        <span className="text-xl line-through text-amber-600">
          ₹{selectedVariant.mrp}
        </span>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
          {selectedVariant.discount_percent}% OFF
        </span>
      </>
    )}
  </div>
)}

            <div>
              <h3 className="font-bold text-amber-950 mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-6 py-3 border-2 rounded-xl transition ${
                      selectedVariant?.id === variant.id
                        ? 'border-amber-600 bg-amber-100 text-amber-950'
                        : 'border-amber-200 text-amber-800 hover:border-amber-400'
                    }`}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </div>
            {selectedVariant && (
  <div className="flex items-center gap-2">
    {selectedVariant.in_stock ? (
  <span className="text-green-600">In Stock</span>
) : (
  <span className="text-red-600">Out of Stock</span>
)}
  </div>
)}
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant?.in_stock || !selectedVariant?.is_active}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Cart
            </Button>
            <div className="pt-6 border-t-2 border-amber-200 space-y-3">
              <div className="flex items-center gap-3 text-amber-800"><Truck className="h-5 w-5 text-amber-600" />Free shipping on orders above ₹999</div>
              <div className="flex items-center gap-3 text-amber-800"><Shield className="h-5 w-5 text-amber-600" />100% Authentic & Pure</div>
            </div>
            {product.benefits && product.benefits.length > 0 && (
              <div className="pt-6 border-t-2 border-amber-200">
                <h3 className="font-bold text-amber-950 mb-3">Health Benefits</h3>
                <ul className="space-y-2">
                  {product.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="h-4 w-4 text-amber-600 mt-1" /><span className="text-amber-800">{benefit}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700"><strong>NO RETURN POLICY:</strong> Due to food safety reasons, we do not accept returns or exchanges.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
