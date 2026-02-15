import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Trash2, 
  Edit, 
  Power, 
  PowerOff, 
  Calendar,
  Percent,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(null);

  const [form, setForm] = useState({
    id: null,
    code: "",
    type: "percentage",
    value: "",
    min_order_amount: 0,
    max_discount: "",
    expiry_date: "",
    usage_limit: "",
    per_user_limit: 1, // Default to 1 use per user
    description: "",
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  // =========================
  // FETCH COUPONS
  // =========================
  const fetchCoupons = async () => {
    try {
      const res = await api.get("/coupons/admin");
      setCoupons(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to fetch coupons");
    }
  };

  // =========================
  // FORMAT DATE FOR INPUT (YYYY-MM-DDTHH:MM)
  // =========================
  const formatDateForInput = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Adjust for timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return "";
    }
  };

  // =========================
  // VALIDATE FORM
  // =========================
  const validateForm = () => {
    if (!form.code.trim()) {
      toast.error("Coupon code is required");
      return false;
    }
    
    if (form.code.length < 3) {
      toast.error("Coupon code must be at least 3 characters");
      return false;
    }
    
    if (!form.value || form.value <= 0) {
      toast.error("Discount value must be greater than 0");
      return false;
    }
    
    if (form.type === "percentage" && form.value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return false;
    }
    
    if (!form.expiry_date) {
      toast.error("Expiry date is required");
      return false;
    }
    
    const expiryDate = new Date(form.expiry_date);
    const now = new Date();
    if (expiryDate <= now) {
      toast.error("Expiry date must be in the future");
      return false;
    }
    
    if (!form.usage_limit || form.usage_limit <= 0) {
      toast.error("Total usage limit is required and must be greater than 0");
      return false;
    }
    
    if (!form.per_user_limit || form.per_user_limit <= 0) {
      toast.error("Per user limit is required and must be greater than 0");
      return false;
    }
    
    return true;
  };

  // =========================
  // CREATE / UPDATE COUPON
  // =========================
  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create expiry date in ISO format with Z
      const expiryDate = new Date(form.expiry_date);
      const expiryISO = expiryDate.toISOString();

      const payload = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        expiry_date: expiryISO,
        usage_limit: Number(form.usage_limit),
        per_user_limit: Number(form.per_user_limit),
        description: form.description || null,
        active: form.id ? form.active : true, // Keep existing status if editing
      };

      if (form.id) {
        await api.put(`/coupons/admin/${form.id}`, payload);
        toast.success(`Coupon ${form.code} updated successfully`);
      } else {
        await api.post("/coupons/admin", payload);
        toast.success(`Coupon ${form.code} created successfully`);
      }

      resetForm();
      fetchCoupons();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        toast.error(errorDetail[0]?.msg || "Validation error");
      } else if (typeof errorDetail === "string") {
        toast.error(errorDetail);
      } else {
        toast.error("Operation failed. Please try again.");
      }
      console.error("Coupon operation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SOFT DELETE (Deactivate)
  // =========================
  const handleSoftDelete = async (id, code) => {
    if (!window.confirm(`Deactivate coupon ${code}? It can be reactivated later.`)) return;

    try {
      setDeleteLoading(id);
      await api.delete(`/coupons/admin/${id}?permanent=false`);
      toast.success(`Coupon ${code} deactivated`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to deactivate coupon");
    } finally {
      setDeleteLoading(null);
    }
  };

  // =========================
  // HARD DELETE (Permanent)
  // =========================
  const handleHardDelete = async (id, code) => {
    if (!window.confirm(`⚠️ PERMANENTLY DELETE coupon ${code}? This action cannot be undone.`)) return;

    try {
      setDeleteLoading(id);
      await api.delete(`/coupons/admin/${id}?permanent=true`);
      toast.success(`Coupon ${code} permanently deleted`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete coupon");
    } finally {
      setDeleteLoading(null);
    }
  };

  // =========================
  // TOGGLE ACTIVE STATUS
  // =========================
  const toggleCoupon = async (id, currentStatus) => {
    try {
      setToggleLoading(id);
      await api.put(`/coupons/admin/${id}/toggle`);
      toast.success(`Coupon ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to toggle coupon status");
    } finally {
      setToggleLoading(null);
    }
  };

  // =========================
  // EDIT COUPON
  // =========================
  const handleEdit = (coupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order_amount: coupon.min_order_amount || 0,
      max_discount: coupon.max_discount || "",
      expiry_date: formatDateForInput(coupon.expiry_date),
      usage_limit: coupon.usage_limit || "",
      per_user_limit: coupon.per_user_limit || 1,
      description: coupon.description || "",
      active: coupon.active,
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({
      id: null,
      code: "",
      type: "percentage",
      value: "",
      min_order_amount: 0,
      max_discount: "",
      expiry_date: "",
      usage_limit: "",
      per_user_limit: 1,
      description: "",
    });
  };

  // =========================
  // CHECK IF COUPON IS EXPIRED
  // =========================
  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-950">
            Coupon Management
          </h1>
          <p className="text-amber-700 mt-1">
            Create and manage discount coupons for your customers
          </p>
        </div>
      </div>

      {/* ================= CREATE/EDIT FORM ================= */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            {form.id ? <Edit className="h-5 w-5 text-amber-700" /> : <Percent className="h-5 w-5 text-amber-700" />}
          </div>
          <h2 className="text-xl font-semibold text-amber-950">
            {form.id ? `Edit Coupon: ${form.code}` : "Create New Coupon"}
          </h2>
          {form.id && (
            <Button
              variant="ghost"
              onClick={resetForm}
              className="ml-auto text-amber-600"
              size="sm"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Coupon Code */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Coupon Code <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g., WELCOME10"
              value={form.code}
              onChange={(e) =>
                setForm({ 
                  ...form, 
                  code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') 
                })
              }
              className="border-2 border-amber-200 focus:border-amber-500 font-mono uppercase"
              maxLength={20}
            />
            <p className="text-xs text-amber-600">
              Only letters, numbers, and underscore
            </p>
          </div>

          {/* Discount Type */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Discount Type <span className="text-red-500">*</span>
            </Label>
            <select
              className="w-full border-2 border-amber-200 rounded-xl p-2.5 bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Discount Value <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              {form.type === "flat" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700">₹</span>
              )}
              <Input
                type="number"
                min="1"
                max={form.type === "percentage" ? "100" : "10000"}
                placeholder={form.type === "percentage" ? "10" : "100"}
                value={form.value}
                onChange={(e) =>
                  setForm({ ...form, value: e.target.value })
                }
                className={`border-2 border-amber-200 focus:border-amber-500 ${form.type === "flat" ? "pl-8" : ""}`}
              />
              {form.type === "percentage" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700">%</span>
              )}
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Expiry Date & Time <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
              <Input
                type="datetime-local"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm({ ...form, expiry_date: e.target.value })
                }
                className="pl-10 border-2 border-amber-200 focus:border-amber-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Total Usage Limit */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Total Usage Limit <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 100"
              value={form.usage_limit}
              onChange={(e) =>
                setForm({ ...form, usage_limit: e.target.value })
              }
              className="border-2 border-amber-200 focus:border-amber-500"
            />
            <p className="text-xs text-amber-600">
              Maximum times this coupon can be used globally
            </p>
          </div>

          {/* Per User Limit */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Per User Limit <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 1"
              value={form.per_user_limit}
              onChange={(e) =>
                setForm({ ...form, per_user_limit: e.target.value })
              }
              className="border-2 border-amber-200 focus:border-amber-500"
            />
            <p className="text-xs text-amber-600">
              How many times one customer can use this coupon
            </p>
          </div>

          {/* Minimum Order Amount */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">
              Minimum Order Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700">₹</span>
              <Input
                type="number"
                min="0"
                placeholder="0 (No minimum)"
                value={form.min_order_amount}
                onChange={(e) =>
                  setForm({ ...form, min_order_amount: e.target.value })
                }
                className="pl-8 border-2 border-amber-200 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Maximum Discount */}
          {form.type === "percentage" && (
            <div className="space-y-2">
              <Label className="text-amber-900 font-medium">
                Maximum Discount Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700">₹</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="No maximum"
                  value={form.max_discount}
                  onChange={(e) =>
                    setForm({ ...form, max_discount: e.target.value })
                  }
                  className="pl-8 border-2 border-amber-200 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label className="text-amber-900 font-medium">
              Description (Optional)
            </Label>
            <Input
              placeholder="e.g., Welcome offer for new customers"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border-2 border-amber-200 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-5 text-base font-semibold"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>{form.id ? "Updating..." : "Creating..."}</span>
              </div>
            ) : (
              <span>{form.id ? "Update Coupon" : "Create Coupon"}</span>
            )}
          </Button>

          {form.id && (
            <Button
              variant="outline"
              onClick={resetForm}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 px-8 py-5 text-base"
              size="lg"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ================= COUPONS LIST ================= */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-amber-950">
              Existing Coupons
            </h2>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
              {coupons.length} Total
            </span>
          </div>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-12 bg-amber-50 rounded-xl">
            <Percent className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-700 font-medium">No coupons created yet</p>
            <p className="text-sm text-amber-600 mt-1">
              Create your first coupon using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const expired = isExpired(coupon.expiry_date);
              const usagePercentage = coupon.usage_limit 
                ? ((coupon.used_count || 0) / coupon.usage_limit * 100).toFixed(1)
                : 0;
              
              return (
                <div
                  key={coupon.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    !coupon.active 
                      ? 'border-gray-200 bg-gray-50' 
                      : expired 
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 hover:border-amber-300 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left Section - Coupon Info */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-mono font-bold text-lg ${
                          !coupon.active 
                            ? 'text-gray-500' 
                            : expired 
                              ? 'text-red-600'
                              : 'text-amber-900'
                        }`}>
                          {coupon.code}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !coupon.active 
                            ? 'bg-gray-200 text-gray-700'
                            : expired 
                              ? 'bg-red-200 text-red-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          {!coupon.active ? 'Inactive' : expired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                          {coupon.type === 'percentage' 
                            ? `${coupon.value}% OFF` 
                            : `₹${coupon.value} OFF`}
                        </span>
                        
                        {coupon.min_order_amount > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                            Min: ₹{coupon.min_order_amount}
                          </span>
                        )}
                        
                        {coupon.max_discount && (
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                            Max: ₹{coupon.max_discount}
                          </span>
                        )}
                        
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full flex items-center gap-1">
                          <span>Uses: {coupon.used_count || 0}/{coupon.usage_limit || '∞'}</span>
                        </span>
                        
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                          Per user: {coupon.per_user_limit || 1}x
                        </span>
                      </div>
                      
                      {coupon.description && (
                        <p className="text-sm text-amber-700 mt-2">
                          {coupon.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {new Date(coupon.expiry_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>
                          Created: {new Date(coupon.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Usage Progress Bar */}
                      {coupon.usage_limit && (
                        <div className="mt-3 max-w-md">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Usage Progress</span>
                            <span className="font-medium text-amber-700">{usagePercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => handleEdit(coupon)}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        disabled={!coupon.active && expired}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        onClick={() => toggleCoupon(coupon.id, coupon.active)}
                        variant="outline"
                        size="sm"
                        disabled={toggleLoading === coupon.id}
                        className={coupon.active 
                          ? "border-green-300 text-green-600 hover:bg-green-50" 
                          : "border-red-300 text-red-600 hover:bg-red-50"
                        }
                      >
                        {toggleLoading === coupon.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-1" />
                        ) : coupon.active ? (
                          <Power className="h-4 w-4 mr-1" />
                        ) : (
                          <PowerOff className="h-4 w-4 mr-1" />
                        )}
                        {coupon.active ? 'Active' : 'Inactive'}
                      </Button>

                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          disabled={deleteLoading === coupon.id}
                        >
                          {deleteLoading === coupon.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-1" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Delete
                        </Button>
                        
                        {/* Delete Options Dropdown */}
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleSoftDelete(coupon.id, coupon.code)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                            >
                              <PowerOff className="h-4 w-4 text-amber-600" />
                              Deactivate (Soft Delete)
                            </button>
                            <button
                              onClick={() => handleHardDelete(coupon.id, coupon.code)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Permanently Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;