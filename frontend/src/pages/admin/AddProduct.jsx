import { useState } from "react";
import api from "../../utils/api";
import { toast } from "sonner";

const emptyVariant = {
  size: "",
  mrp: "",
  discount_percent: 0,
  sku: "",
  in_stock: true,
  is_active: true,
};

const AddProduct = () => {
  /* ---------------- PRODUCT ---------------- */
  const [product, setProduct] = useState({
    name: "",
    slug: "",
    category: "",
    description: "",
    benefits: [],
    image_urls: [],
    is_active: true,
  });

  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ---------------- HELPERS ---------------- */

  const generateSlug = (name) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  /* ---------------- IMAGE UPLOAD ---------------- */

  const handleImageUpload = async (file) => {
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
        { method: "POST", body: formData }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);

      setProduct((p) => ({
        ...p,
        image_urls: [...p.image_urls, data.secure_url],
      }));

      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- VARIANTS ---------------- */

  const addVariant = () => {
    setVariants((v) => [...v, { ...emptyVariant }]);
  };

  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const removeVariant = (index) => {
    setVariants((v) => v.filter((_, i) => i !== index));
  };

  /* ---------------- SAVE ---------------- */

  const saveProduct = async () => {
    if (!product.name || !product.category) {
      toast.error("Name and category are required");
      return;
    }

    if (variants.length === 0) {
      toast.error("Add at least one variant");
      return;
    }

    setSaving(true);

    try {
      /* 1️⃣ CREATE PRODUCT */
      const productPayload = {
        ...product,
        slug: product.slug || generateSlug(product.name),
      };

      const productRes = await api.post(
        "/admin/products",
        productPayload
      );

      const productId = productRes.data.id;

      /* 2️⃣ CREATE VARIANTS */
      for (const v of variants) {
        if (!v.size || !v.sku || !v.mrp) {
          toast.error("Each variant must have size, MRP, SKU");
          setSaving(false);
          return;
        }

        const selling_price =
          v.mrp - (v.mrp * (v.discount_percent || 0)) / 100;

        await api.post("/admin/variants", {
          product_id: productId,
          size: v.size,
          mrp: Number(v.mrp),
          discount_percent: Number(v.discount_percent || 0),
          selling_price: Number(selling_price.toFixed(2)),
          sku: v.sku,
          in_stock: v.in_stock,
          is_active: v.is_active,
        });
      }

      toast.success("Product created successfully");
      setProduct({
        name: "",
        slug: "",
        category: "",
        description: "",
        benefits: [],
        image_urls: [],
        is_active: true,
      });
      setVariants([]);
    } catch (err) {
      toast.error("Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-10">

      {/* PRODUCT */}
      <div className="bg-white p-6 rounded-xl border">
        <h2 className="text-xl font-bold mb-4">Add Product</h2>

        <input
          className="input w-full mb-3"
          placeholder="Product name"
          value={product.name}
          onChange={(e) =>
            setProduct({
              ...product,
              name: e.target.value,
              slug: generateSlug(e.target.value),
            })
          }
        />

        <input
          className="input w-full mb-3"
          placeholder="Category (e.g. powder, blend)"
          value={product.category}
          onChange={(e) =>
            setProduct({ ...product, category: e.target.value })
          }
        />

        <textarea
          className="input w-full mb-3"
          placeholder="Description"
          value={product.description}
          onChange={(e) =>
            setProduct({ ...product, description: e.target.value })
          }
        />

        <input
          className="input w-full mb-3"
          placeholder="Benefits (comma separated)"
          value={product.benefits.join(",")}
          onChange={(e) =>
            setProduct({
              ...product,
              benefits: e.target.value.split(",").map((b) => b.trim()),
            })
          }
        />

        {/* IMAGES */}
        <div className="flex gap-3 mb-3">
          {product.image_urls.map((img, i) => (
            <img key={i} src={img} className="h-20 border rounded" />
          ))}
        </div>

        <input
          type="file"
          onChange={(e) => handleImageUpload(e.target.files[0])}
        />
        {uploading && <p className="text-sm">Uploading image…</p>}
      </div>

      {/* VARIANTS */}
      <div>
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Variants</h2>
          <button
            onClick={addVariant}
            className="bg-amber-600 text-white px-4 py-2 rounded"
          >
            + Add Variant
          </button>
        </div>

        {variants.map((v, i) => {
          const selling =
            v.mrp
              ? v.mrp - (v.mrp * (v.discount_percent || 0)) / 100
              : 0;

          return (
            <div key={i} className="bg-white p-5 rounded-xl border mb-4">
              <div className="grid grid-cols-4 gap-4 mb-3">
                <input
                  placeholder="Size (100g)"
                  value={v.size}
                  onChange={(e) =>
                    updateVariant(i, "size", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="MRP"
                  value={v.mrp}
                  onChange={(e) =>
                    updateVariant(i, "mrp", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="% Discount"
                  value={v.discount_percent}
                  onChange={(e) =>
                    updateVariant(i, "discount_percent", e.target.value)
                  }
                />
                <input
                  disabled
                  value={selling ? selling.toFixed(2) : ""}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <input
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) =>
                    updateVariant(i, "sku", e.target.value)
                  }
                />

                <label>
                  <input
                    type="checkbox"
                    checked={v.in_stock}
                    onChange={() =>
                      updateVariant(i, "in_stock", !v.in_stock)
                    }
                  />{" "}
                  In Stock
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={v.is_active}
                    onChange={() =>
                      updateVariant(i, "is_active", !v.is_active)
                    }
                  />{" "}
                  Enabled
                </label>
              </div>

              <button
                onClick={() => removeVariant(i)}
                className="text-red-600 text-sm"
              >
                Remove Variant
              </button>
            </div>
          );
        })}
      </div>

      {/* SAVE */}
      <button
        disabled={saving}
        onClick={saveProduct}
        className="bg-green-600 text-white px-6 py-3 rounded"
      >
        {saving ? "Saving…" : "Create Product"}
      </button>
    </div>
  );
};

export default AddProduct;
