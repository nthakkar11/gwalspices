import React, { useEffect, useState } from "react";
import {
  Users,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  Ticket,
  CreditCard,
  Wallet,
  Calendar,
  Percent,
  Award,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "sonner";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Admin = () => {
  const [stats, setStats] = useState(null);
  const [couponStats, setCouponStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch order stats
      const orderStatsRes = await api.get(`/orders/admin/stats?period=${period}`);
      setStats(orderStatsRes.data);
      
      // Fetch coupon stats
      const couponStatsRes = await api.get(`/orders/admin/coupon-stats?period=${period}`);
      setCouponStats(couponStatsRes.data);
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load real-time stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const COLORS = ['#D97706', '#059669', '#DC2626', '#7C3AED'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-amber-700">Loading real-time dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER WITH LAST UPDATED */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-950">Dashboard</h1>
          <p className="text-amber-700 mt-1 flex items-center gap-2">
            <span>Real-time overview of your store performance</span>
            {refreshing && (
              <span className="flex items-center gap-1 text-xs bg-amber-100 px-2 py-1 rounded-full">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-600 border-t-transparent"></div>
                Updating...
              </span>
            )}
          </p>
        </div>
        
        {/* PERIOD SELECTOR */}
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border-2 border-amber-200 rounded-xl px-4 py-2 text-amber-900 font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-amber-100 rounded-xl hover:bg-amber-200 transition"
            title="Refresh"
          >
            <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* MAIN STATS GRID - REAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Orders"
          value={stats?.total_orders?.toLocaleString() || "0"}
          change={`${stats?.order_growth > 0 ? '+' : ''}${stats?.order_growth || 0}%`}
          positive={stats?.order_growth > 0}
          icon={ShoppingCart}
          bgColor="from-blue-500 to-blue-600"
          period={period}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue)}
          change={`${stats?.revenue_growth > 0 ? '+' : ''}${stats?.revenue_growth || 0}%`}
          positive={stats?.revenue_growth > 0}
          icon={IndianRupee}
          bgColor="from-green-500 to-green-600"
          period={period}
        />
        <StatCard
          title="Delivery Rate"
          value={`${stats?.delivery_rate || 0}%`}
          change={`${stats?.order_status?.delivered || 0} delivered`}
          positive={stats?.delivery_rate > 70}
          icon={CheckCircle}
          bgColor="from-amber-500 to-orange-600"
          period={period}
        />
        <StatCard
          title="Coupon Savings"
          value={formatCurrency(couponStats?.total_discount || 0)}
          change={`${couponStats?.total_uses || 0} uses`}
          positive={couponStats?.usage_growth > 0}
          icon={Ticket}
          bgColor="from-purple-500 to-purple-600"
          period={period}
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-amber-950 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Daily Sales (Last 7 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.daily_sales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#92400E" />
                <YAxis stroke="#92400E" />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', borderColor: '#D97706' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#D97706" 
                  strokeWidth={2}
                  dot={{ fill: '#D97706' }}
                  name="Sales (₹)"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#059669" 
                  strokeWidth={2}
                  dot={{ fill: '#059669' }}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-amber-950 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Payment Methods
          </h3>
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'COD', value: stats?.payment_methods?.cod || 0 },
                    { name: 'Prepaid', value: stats?.payment_methods?.prepaid || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#D97706" />
                  <Cell fill="#059669" />
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-600"></div>
              <span className="text-sm text-amber-900">COD: {stats?.payment_methods?.cod || 0} orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
              <span className="text-sm text-amber-900">Prepaid: {stats?.payment_methods?.prepaid || 0} orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* ORDER STATUS & COUPON PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-amber-950 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Order Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-900">Pending</span>
              </div>
              <span className="font-bold text-amber-950">{stats?.order_status?.pending || 0}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-amber-900">Shipped</span>
              </div>
              <span className="font-bold text-amber-950">{stats?.order_status?.shipped || 0}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-amber-900">Delivered</span>
              </div>
              <span className="font-bold text-amber-950">{stats?.order_status?.delivered || 0}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-amber-900">Cancelled</span>
              </div>
              <span className="font-bold text-amber-950">{stats?.order_status?.cancelled || 0}</span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-700">Completion Rate</span>
                <span className="font-semibold text-amber-950">
                  {stats?.delivery_rate || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                  style={{ width: `${stats?.delivery_rate || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon Performance - REAL DATA */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-amber-950 mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-600" />
            Coupon Performance
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 p-3 rounded-xl">
                <p className="text-xs text-amber-600">Active Coupons</p>
                <p className="text-2xl font-bold text-amber-950">{couponStats?.active_coupons || 0}</p>
                <p className="text-xs text-amber-600 mt-1">
                  of {couponStats?.total_coupons || 0} total
                </p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl">
                <p className="text-xs text-amber-600">Total Uses</p>
                <p className="text-2xl font-bold text-amber-950">{couponStats?.total_uses || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {couponStats?.usage_growth > 0 ? '+' : ''}{couponStats?.usage_growth || 0}% growth
                </p>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm font-medium text-amber-900 mb-3">Most Popular Coupons</p>
              <div className="space-y-2">
                {couponStats?.popular_coupons?.length > 0 ? (
                  couponStats.popular_coupons.map((coupon, index) => (
                    <div key={coupon.code} className="flex justify-between items-center p-2 hover:bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-amber-900">
                          {coupon.code}
                        </span>
                        <span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">
                          {coupon.uses} uses
                        </span>
                        <span className="text-xs text-purple-600">
                          {coupon.unique_users} users
                        </span>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        -{formatCurrency(coupon.discount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-600 text-center py-4">
                    No coupon usage in this period
                  </p>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/admin/coupons'}
              className="w-full mt-2 border-2 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl px-4 py-2 text-sm font-medium transition"
            >
              Manage Coupons
            </button>
          </div>
        </div>

        {/* Quick Actions & Tips */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Quick Actions
          </h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/admin/coupons'}
              className="w-full bg-white/20 hover:bg-white/30 rounded-xl p-3 text-left transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Create New Coupon
              </span>
              <span className="text-xl">→</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/products'}
              className="w-full bg-white/20 hover:bg-white/30 rounded-xl p-3 text-left transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Add New Product
              </span>
              <span className="text-xl">→</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/orders'}
              className="w-full bg-white/20 hover:bg-white/30 rounded-xl p-3 text-left transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                View Pending Orders
                {stats?.order_status?.pending > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                    {stats.order_status.pending}
                  </span>
                )}
              </span>
              <span className="text-xl">→</span>
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Insight
            </p>
            <p className="text-xs text-white/90">
              {couponStats?.popular_coupons?.[0] ? (
                <>🔥 {couponStats.popular_coupons[0].code} is your top coupon with {couponStats.popular_coupons[0].uses} uses this {period}</>
              ) : (
                <>💡 Create a welcome coupon to boost first-time purchases</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- STAT CARD COMPONENT -------------------- */
const StatCard = ({ title, value, change, positive, icon: Icon, bgColor, period }) => {
  return (
    <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-amber-600 text-sm font-medium">{title}</p>
          <h2 className="text-3xl font-bold text-amber-950 mt-2">{value}</h2>
        </div>
        <div className={`p-3 bg-gradient-to-br ${bgColor} rounded-xl shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
        <span className="text-xs text-amber-600">vs previous {period}</span>
      </div>
    </div>
  );
};

// SINGLE export default at the end
export default Admin;