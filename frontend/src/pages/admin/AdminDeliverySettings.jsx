import { useEffect, useState } from "react";
import api from "../../utils/api";
import { toast } from "sonner";

const ALL_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const AdminDeliverySettings = () => {
  const [enabledStates, setEnabledStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  /* FETCH CURRENT SETTINGS */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/admin/delivery/states");
        setEnabledStates(res.data.enabled_states || []);
      } catch (err) {
        toast.error("Failed to load delivery settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /* TOGGLE STATE */
  const toggleState = (state) => {
    setEnabledStates((prev) =>
      prev.includes(state)
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  };

  /* SAVE SETTINGS */
  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/admin/delivery/states", {
        enabled_states: enabledStates
      });
      toast.success("Delivery settings updated successfully");
    } catch (err) {
      toast.error("Failed to save delivery settings");
    } finally {
      setSaving(false);
    }
  };

  const filteredStates = ALL_STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <p className="text-gray-600">Loading delivery settings…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-900">
        Delivery Settings
      </h1>

      <p className="text-sm text-gray-600">
        Enable or disable delivery availability by state.  
        Users will only be able to place orders if their delivery state is enabled.
      </p>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search state…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-amber-300 px-3 py-2 rounded"
      />

      {/* STATES LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStates.map((state) => {
          const active = enabledStates.includes(state);
          return (
            <div
              key={state}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                active
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="font-medium text-gray-800">{state}</span>

              <button
                onClick={() => toggleState(state)}
                className={`px-4 py-1 rounded text-sm font-semibold transition ${
                  active
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {active ? "Enabled" : "Disabled"}
              </button>
            </div>
          );
        })}
      </div>

      {/* SAVE */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
};

export default AdminDeliverySettings;
