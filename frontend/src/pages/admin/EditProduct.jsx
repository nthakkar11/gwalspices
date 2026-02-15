import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import { toast } from "sonner";

const EditProduct = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const p = await api.get(`/admin/products/${id}`);
    const v = await api.get(`/admin/variants`, {
  params: { product_id: id }
});
    setProduct(p.data);
    setVariants(v.data);
  };

  /* ---------- PRODUCT ---------- */

  const saveProduct = async () => {
  await api.patch(`/admin/products/${id}`, {
    name: product.name,
    description: product.description,
    benefits: product.benefits,
    image_urls: product.image_urls,
    is_active: product.is_active,
  });

  toast.success("Product updated");
};

  const toggleProduct = async () => {
    const res = await api.put(`/admin/products/${id}/toggle`);
    setProduct({ ...product, is_active: res.data.is_active });
  };

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Cloudinary Error:", data);
      throw new Error(data.error?.message || "Upload failed");
    }

    // ✅ Save URL in product state
    setProduct((prev) => ({
      ...prev,
      image_urls: [data.secure_url],
    }));

    toast.success("Image uploaded successfully");
  } catch (err) {
    toast.error("Image upload failed");
    console.error(err);
  } finally {
    setUploading(false);
  }
};

  /* ---------- VARIANTS ---------- */

  const updateVariant = (id, field, value) => {
    setVariants(v =>
      v.map(x => x.id === id ? { ...x, [field]: value } : x)
    );
  };

  const saveVariant = async (v) => {
    await api.put(`/admin/variants/${v.id}`, {
      ...v,
      mrp: Number(v.mrp),
      discount_percent: Number(v.discount_percent || 0)
    });
    toast.success(`Variant ${v.size} updated`);
  };

  const toggleStock = async (v) => {
    const res = await api.put(`/admin/products/variants/${v.id}/stock`);
    updateVariant(v.id, "in_stock", res.data.in_stock);
  };

 const forceDeleteProduct = async () => {
  const confirm = window.confirm(
    "⚠️ This will permanently delete the product and all its variants. This cannot be undone."
  );
  if (!confirm) return;

  try {
    const res = await api.delete(`/admin/products/${id}/force`);

    if (res.status === 200 && res.data?.success) {
      toast.success("Product permanently deleted");
      navigate("/admin/products");
    } else {
      toast.error("Unexpected response from server");
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete product");
  }
};

  if (!product) return <div>Loading...</div>;

  return (
    <div className="space-y-10">

      {/* PRODUCT SECTION */}
      <div className="bg-white p-6 rounded-xl border">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Product Details</h2>
          <button
            onClick={toggleProduct}
            className={`px-4 py-2 rounded text-white ${
              product.is_active ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {product.is_active ? "Disable" : "Enable"}
          </button>
          <button
  onClick={forceDeleteProduct}
  className="bg-red-700 text-white px-4 py-2 rounded"
>
  Force Delete Product
</button>

        </div>
        

        <input
          className="input w-full mb-3"
          value={product.name}
          onChange={e => setProduct({ ...product, name: e.target.value })}
        />

        <textarea
          className="input w-full mb-3"
          value={product.description}
          onChange={e => setProduct({ ...product, description: e.target.value })}
        />

        <input
          className="input w-full mb-3"
          placeholder="Comma separated benefits"
          value={product.benefits.join(",")}
          onChange={e =>
            setProduct({ ...product, benefits: e.target.value.split(",") })
          }
        />

        <div className="flex gap-4 mb-4">
          {product.image_urls.map((img, i) => (
            <img key={i} src={img} alt="" className="h-20 rounded border" />
          ))}
        </div>

        <input
  type="file"
  accept="image/*"
  onChange={handleImageChange}
/>

        {uploading && <p>Uploading...</p>}

        <button
          onClick={saveProduct}
          className="mt-4 bg-amber-600 text-white px-6 py-2 rounded"
        >
          Save Product
        </button>
      </div>

      {/* VARIANTS */}
      <div>
        <h2 className="text-xl font-bold mb-4">Variants</h2>

        {variants.map(v => {
          const selling =
            v.mrp - (v.mrp * (v.discount_percent || 0)) / 100;

          return (
            <div key={v.id} className="bg-white p-5 rounded-xl border mb-4">
              <h3 className="font-semibold mb-3">{v.size}</h3>

              <div className="grid grid-cols-4 gap-4 mb-3">
                <input type="number" value={v.mrp}
                  onChange={e => updateVariant(v.id, "mrp", e.target.value)} />

                <input type="number" value={v.discount_percent || ""}
                  placeholder="% Off"
                  onChange={e => updateVariant(v.id, "discount_percent", e.target.value)} />

                <input disabled value={selling.toFixed(2)} />

                <input disabled value={v.sku} />
              </div>

              <div className="flex gap-4 items-center mb-3">
                <label>
                  <input type="checkbox"
                    checked={v.in_stock}
                    onChange={() => toggleStock(v)} />
                  In Stock
                </label>

                <label>
                  <input type="checkbox"
                    checked={v.is_active}
                    onChange={() => updateVariant(v.id, "is_active", !v.is_active)} />
                  Enabled
                </label>
              </div>

              <button
                onClick={() => saveVariant(v)}
                className="bg-amber-600 text-white px-4 py-2 rounded"
              >
                Save Variant
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EditProduct;
