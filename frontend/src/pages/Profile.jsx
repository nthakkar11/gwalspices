import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../utils/api';
import { Trash2 } from 'lucide-react';

const Profile = () => {
  const { user, loading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false });

  useEffect(() => {
  if (!loading && !user) {
    navigate('/login');
  }

  if (user) {
    setAddresses(user.addresses || []);
  }
}, [user, loading, navigate]);

const handleAddAddress = async () => {
  try {
    await api.post('/auth/addresses', newAddress);

    await refreshUser(); // 🔑 GLOBAL SYNC

    toast.success('Address added successfully');
    setShowNewAddress(false);

    setNewAddress({
      name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      is_default: false,
    });
  } catch (error) {
    console.error(error.response?.data || error);
    toast.error('Failed to add address');
  }
};


const handleDeleteAddress = async (addressId) => {
  try {
    await api.delete(`/auth/addresses/${addressId}`);

    await refreshUser(); // 🔑 GLOBAL SYNC

    toast.success('Address deleted');
  } catch (error) {
    console.error(error.response?.data || error);
    toast.error('Failed to delete address');
  }
};


  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-amber-950 mb-8">My Profile</h1>
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold text-amber-950 mb-4">Account Details</h2>
          <div className="space-y-2">
            <p className="text-amber-800"><strong>Name:</strong> {user?.full_name}</p>
            <p className="text-amber-800"><strong>Email:</strong> {user?.email}</p>
            <p className="text-amber-800"><strong>Phone:</strong> {user?.phone}</p>
          </div>
        </div>
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-amber-950 mb-4">Saved Addresses</h2>
          {addresses.length > 0 ? (
            <div className="space-y-3 mb-4">
              {addresses.map((addr) => (
                <div key={addr.id} className="p-4 border-2 border-amber-200 rounded-xl flex justify-between items-start">
                  <div>
                    <p className="font-bold text-amber-950">{addr.name}</p>
                    <p className="text-sm text-amber-800">{addr.address_line1}, {addr.address_line2}</p>
                    <p className="text-sm text-amber-800">{addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="text-sm text-amber-700">Phone: {addr.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAddress(addr.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-amber-700 mb-4">No saved addresses</p>
          )}
          <Button onClick={() => setShowNewAddress(!showNewAddress)} variant="outline" className="w-full border-2 border-amber-600 text-amber-900">
            + Add New Address
          </Button>
          {showNewAddress && (
            <div className="mt-4 space-y-4 p-4 bg-amber-50 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={newAddress.name} onChange={(e) => setNewAddress({...newAddress, name: e.target.value})} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={newAddress.phone} onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} className="mt-1" /></div>
              </div>
              <div><Label>Address Line 1</Label><Input value={newAddress.address_line1} onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})} className="mt-1" /></div>
              <div><Label>Address Line 2</Label><Input value={newAddress.address_line2} onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})} className="mt-1" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City</Label><Input value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} className="mt-1" /></div>
                <div><Label>State</Label><Input value={newAddress.state} onChange={(e) => setNewAddress({...newAddress, state: e.target.value})} className="mt-1" /></div>
                <div><Label>Pincode</Label><Input value={newAddress.pincode} onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})} className="mt-1" /></div>
              </div>
              <Button onClick={handleAddAddress} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white w-full">Save Address</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
