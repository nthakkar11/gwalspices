import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { MoreVertical } from "lucide-react";
import ProductRowMenu from "../../components/admin/ProductRowMenu";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/admin/products").then(res => setProducts(res.data));
  }, []);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
  onClick={() => navigate("/admin/products/new")}
  className="bg-amber-600 text-white px-4 py-2 rounded"
>
  + Add Product
</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 text-left">
            <tr>
              <th className="p-4">Product</th>
              <th>Category</th>
              <th>Status</th>
              <th className="text-right p-4"></th>
            </tr>
          </thead>

          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t hover:bg-amber-50/50">
                <td className="p-4 font-medium">{p.name}</td>
                <td>{p.category}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs ${
                    p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {p.is_active ? "Enabled" : "Disabled"}
                  </span>
                </td>

                <td className="p-4 text-right">
  <ProductRowMenu productId={p.id} />
</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;
