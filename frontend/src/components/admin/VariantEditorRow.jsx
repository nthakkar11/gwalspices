import { useState } from "react";
import api from "../../utils/api";

const VariantEditorRow = ({ variant, onUpdated }) => {
  const [data, setData] = useState(variant);

  const discount =
    data.selling_price
      ? Math.round(
          ((data.mrp - data.selling_price) / data.mrp) * 100
        )
      : null;

  const saveVariant = async () => {
    const res = await api.put(
      `/admin/variants/${data.id}`,
      data
    );
    onUpdated(res.data);
  };

  return (
    <div className="border rounded-xl p-4 grid grid-cols-7 gap-3 items-center">
      <div className="font-semibold">{data.name}</div>

      <input
        type="number"
        className="border p-2 rounded"
        value={data.mrp}
        onChange={(e) =>
          setData({ ...data, mrp: +e.target.value })
        }
        placeholder="MRP"
      />

      <input
        type="number"
        className="border p-2 rounded"
        value={data.selling_price || ""}
        onChange={(e) =>
          setData({
            ...data,
            selling_price: e.target.value
              ? +e.target.value
              : null,
          })
        }
        placeholder="Selling Price"
      />

      <div className="text-sm text-gray-600">
        {discount ? `${discount}% OFF` : "—"}
      </div>

      <button
        className={`px-3 py-1 rounded text-sm ${
          data.in_stock
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
        onClick={() =>
          setData({ ...data, in_stock: !data.in_stock })
        }
      >
        {data.in_stock ? "In Stock" : "Out of Stock"}
      </button>

      <button
        className={`px-3 py-1 rounded text-sm ${
          data.is_active
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
        onClick={() =>
          setData({ ...data, is_active: !data.is_active })
        }
      >
        {data.is_active ? "Enabled" : "Disabled"}
      </button>

      <button
        onClick={saveVariant}
        className="bg-amber-600 text-white px-3 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
};

export default VariantEditorRow;
