import { Outlet, NavLink } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-amber-50 text-amber-900">
      {/* OFFSET FOR FIXED HEADER (your main Header.jsx is fixed) */}
      <div className="flex">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-amber-200 min-h-[calc(100vh-5rem)] px-6 py-8">
          <h2 className="text-xl font-bold mb-8 tracking-wide">
            Admin Panel
          </h2>

          <nav className="space-y-2 text-sm font-medium">
            <AdminLink to="/admin" end>
              Dashboard
            </AdminLink>

            <AdminLink to="/admin/products">
              Products
            </AdminLink>

            <AdminLink to="/admin/orders">
              Orders
            </AdminLink>

            <AdminLink to="/admin/discounts">
              Discounts
            </AdminLink>
            <AdminLink
  to="/admin/coupons"
  className="block px-4 py-2 rounded-lg hover:bg-amber-100"
>
  Coupons
</AdminLink>

          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

/* ---------------------------------- */
/* ACTIVE NAV LINK COMPONENT           */
/* ---------------------------------- */
const AdminLink = ({ to, children, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block px-4 py-2 rounded-lg transition ${
          isActive
            ? "bg-amber-100 text-amber-900 font-semibold"
            : "text-amber-700 hover:bg-amber-50"
        }`
      }
    >
      {children}
    </NavLink>
  );
};

export default AdminLayout;
