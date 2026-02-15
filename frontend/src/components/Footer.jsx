import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-amber-900 to-orange-900 border-t-4 border-amber-600 mt-20">
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">GWAL SPICES</h3>
            <p className="text-amber-100 leading-relaxed">
              Premium quality spices for authentic Indian cooking.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-amber-100 hover:text-white transition">Home</Link></li>
              <li><Link to="/shop" className="text-amber-100 hover:text-white transition">Shop</Link></li>
              <li><Link to="/my-orders" className="text-amber-100 hover:text-white transition">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2">
              <li className="text-amber-100 flex items-center gap-2"><Phone className="h-4 w-4" />+91 99999 99999</li>
              <li className="text-amber-100 flex items-center gap-2"><Mail className="h-4 w-4" />orders@gwalspices.in</li>
              <li className="text-amber-100 flex items-start gap-2"><MapPin className="h-4 w-4 mt-1" />Gwalior, MP, India</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Follow Us</h4>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="text-amber-100 hover:text-white transition"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="text-amber-100 hover:text-white transition"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="text-amber-100 hover:text-white transition"><Twitter className="h-5 w-5" /></a>
            </div>
            <p className="text-xs text-amber-200"><strong>NO RETURN POLICY:</strong> Due to food safety, we do not accept returns.</p>
          </div>
        </div>
        <div className="border-t border-amber-700 mt-8 pt-8 text-center">
          <p className="text-amber-100">© 2025 GWAL Spices. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
