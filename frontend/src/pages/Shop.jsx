import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?category=${filter}` : '';
      const response = await api.get(`/products${params}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product, variant) => {
    addToCart(variant, product, 1);
    toast.success(`${product.name} added to cart`);
  };

  const categories = [
    { id: 'all', label: 'All Spices' },
    { id: 'powder', label: 'Powders' },
    { id: 'blend', label: 'Blends' },
    { id: 'whole', label: 'Whole Spices' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-sm font-medium border-2 border-amber-300 inline-block mb-4">
            Our Collection
          </span>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-6">
            Premium Spices
          </h1>
          <p className="text-lg text-amber-800 max-w-2xl mx-auto">
            Handcrafted blends and pure spices, sourced with care from the finest farms
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setFilter(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                filter === category.id
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-amber-100 text-amber-900 border-2 border-amber-300 hover:bg-amber-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="group border-2 border-amber-200 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 bg-white overflow-hidden rounded-2xl"
              >
                <Link to={`/product/${product.slug}`}>
                  <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </Link>

                <div className="p-6 space-y-4">
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="text-2xl font-bold text-amber-950 group-hover:text-amber-700 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {product.variants && product.variants.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-amber-700 uppercase tracking-wide">From</span>
                        <span className="text-2xl font-bold text-amber-950">
                          ₹{Math.min(...product.variants.map(v => v.selling_price))}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product, product.variants[0])}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        Add to Cart
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-amber-700 text-lg">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
