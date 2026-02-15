import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProductRowMenu = ({ productId }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)}>
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded shadow w-40 z-50">
          <button
            onClick={() => navigate(`/admin/products/${productId}/edit`)}
            className="block w-full text-left px-4 py-2 hover:bg-amber-50"
          >
            Edit Product
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductRowMenu;
