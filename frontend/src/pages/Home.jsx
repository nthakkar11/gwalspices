import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Award, Leaf, Shield } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Hero Section */}
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-sm font-medium border-2 border-amber-300">
                  Premium Quality
                </span>
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-bold text-amber-950 leading-tight">
                Bring Home the True Taste of{' '}
                <span className="bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                  Indian Spices
                </span>
              </h1>
              
              <p className="text-xl text-amber-800 leading-relaxed">
                Handpicked from trusted farms, sun-dried naturally to preserve its natural oils and aroma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/shop">
                  <button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl transition-all duration-300">
                    Explore Products
                  </button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1596040033229-a0b34e45c43f?q=80&w=800"
                  alt="Premium Spices"
                  className="w-full max-w-xl object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      

      {/* Why Choose Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-sm font-medium border-2 border-amber-300 inline-block mb-4">
              Quality Promise
            </span>
            <h2 className="text-5xl font-bold text-amber-950">
              Why Choose GWAL Spices?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group border-2 border-amber-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 bg-white">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-amber-950 mb-3">100% Pure Spices</h3>
              <p className="text-amber-700">Free from adulteration & chemicals.</p>
            </div>
            
            <div className="group border-2 border-amber-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 bg-white">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-amber-950 mb-3">Farm Fresh</h3>
              <p className="text-amber-700">Sourced directly from trusted farms.</p>
            </div>
            
            <div className="group border-2 border-amber-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 bg-white">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-amber-950 mb-3">Lab Tested</h3>
              <p className="text-amber-700">Guaranteed purity & safety.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-amber-900 to-orange-900 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-5xl font-bold text-white mb-6">
            Experience Freshness Like Never Before
          </h2>
          <p className="text-xl text-amber-100 mb-12">
            Order premium spices directly from us and taste the difference.
          </p>
          <Link to="/shop">
            <button className="bg-white hover:bg-amber-50 text-amber-900 px-12 py-6 rounded-xl font-bold text-lg shadow-xl transition-all duration-300">
              Browse Products
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
