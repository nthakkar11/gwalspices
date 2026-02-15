import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Toaster } from './components/ui/sonner';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Shop from './pages/Shop';
import About from './pages/About';
import Contact from './pages/Contact';
import ThankYou from './pages/ThankYou';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import Review from './pages/Review';
import OrderSuccess from './pages/OrderSuccess';
import PaymentFailed from './pages/PaymentFailed';

import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import Admin from './pages/admin/Admin';
import AddProduct from "./pages/admin/AddProduct";
import AdminProducts from './pages/admin/AdminProducts';
import AdminCoupons from './pages/admin/AdminCoupons';
import EditProduct from './pages/admin/EditProduct';
import AdminDeliverySettings from './pages/admin/AdminDeliverySettings';

import GokwikCheckout from './pages/GokwikCheckout';
import AdminOrders from './pages/admin/AdminOrders';

import './index.css';

// ✅ Cart Initializer Component - Handles cart merging on login/logout


function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          {/* ✅ CartInitializer must be inside CartProvider to access useCart */}
          
          <div className="min-h-screen flex flex-col">
            <Navbar />
            
            {/* Offset for fixed navbar */}
            <main className="pt-[80px] flex-1">
              <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/review" element={<Review />} />
                <Route path="/order-success/:orderId" element={<OrderSuccess />} />
                <Route path="/payment-failed/:orderId" element={<PaymentFailed />} />
                <Route path="/gokwik-checkout" element={<GokwikCheckout />} />

                {/* ADMIN ROUTES – PROTECTED */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<Admin />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/:id/edit" element={<EditProduct />} />
                  <Route path="products/new" element={<AddProduct />} />
                  <Route path="delivery" element={<AdminDeliverySettings />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="orders" element={<AdminOrders />} />
                </Route>
                
                {/* 404 - Not Found Route */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-amber-950 mb-4">404</h1>
                      <p className="text-amber-700 mb-6">Page not found</p>
                      <a href="/" className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700">
                        Go Home
                      </a>
                    </div>
                  </div>
                } />
              </Routes>
            </main>

            <Footer />
            <Toaster position="bottom-right" richColors />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;