import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      toast.success('Registration successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-8 shadow-xl">
          <h1 className="text-4xl font-bold text-amber-950 mb-2">Create Account</h1>
          <p className="text-amber-700 mb-8">Join the GWAL Spices family</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-amber-900">Full Name</Label>
              <Input name="full_name" value={formData.full_name} onChange={handleChange} required className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12" />
            </div>
            <div>
              <Label className="text-amber-900">Email</Label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12" />
            </div>
            <div>
              <Label className="text-amber-900">Phone</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} required className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12" />
            </div>
            <div>
              <Label className="text-amber-900">Password</Label>
              <Input name="password" type="password" value={formData.password} onChange={handleChange} required className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl h-12 font-semibold">
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-amber-800">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
