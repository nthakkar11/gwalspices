import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const loggedInUser = await login(email, password);

    toast.success('Login successful!');

    if (loggedInUser?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Login failed');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-8 shadow-xl">
          <h1 className="text-4xl font-bold text-amber-950 mb-2">Welcome Back</h1>
          <p className="text-amber-700 mb-8">Login to your account</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-amber-900">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12"
                placeholder="admin@gwalspices.in"
              />
            </div>
            <div>
              <Label className="text-amber-900">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 border-2 border-amber-200 focus:border-amber-600 rounded-xl h-12"
                placeholder="Enter your password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl h-12 font-semibold"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-amber-800">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-600 hover:text-orange-700 font-semibold">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
