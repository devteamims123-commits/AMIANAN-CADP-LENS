import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "./AgencyLGURegistration.css";

const REGION = "Region I - Ilocos Region";
const LOCATIONS = {
  'Ilocos Norte': ['Adams', 'Bacarra', 'Badoc', 'Bangui', 'Banna', 'Batac City', 'Burgos', 'Carasi', 'Currimao', 'Dingras', 'Dumalneg', 'Laoag City', 'Marcos', 'Nueva Era', 'Pagudpud', 'Paoay', 'Pasuquin', 'Piddig', 'Pinili', 'San Nicolas', 'Sarrat', 'Solsona', 'Vintar'],
  'Ilocos Sur': ['Alilem', 'Banayoyo', 'Bantay', 'Burgos', 'Cabugao', 'Candon City', 'Caoayan', 'Cervantes', 'Galimuyod', 'Gregorio del Pilar', 'Lidlidda', 'Magsingal', 'Nagbukel', 'Narvacan', 'Quirino', 'Salcedo', 'San Emilio', 'San Esteban', 'San Ildefonso', 'San Juan', 'San Vicente', 'Santa', 'Santa Catalina', 'Santa Cruz', 'Santa Lucia', 'Santa Maria', 'Santiago', 'Santo Domingo', 'Sigay', 'Sinait', 'Sugpon', 'Suyo', 'Tagudin', 'Vigan City'],
  'La Union': ['Agoo', 'Aringay', 'Bacnotan', 'Bagulin', 'Balaoan', 'Bangar', 'Bauang', 'Burgos', 'Caba', 'Luna', 'Naguilian', 'Pugo', 'Rosario', 'San Fernando City', 'San Gabriel', 'San Juan', 'Santo Tomas', 'Santol', 'Sudipen', 'Tubao'],
  'Pangasinan': ['Agno', 'Aguilar', 'Alaminos City', 'Alcala', 'Anda', 'Asingan', 'Balungao', 'Bani', 'Basista', 'Bautista', 'Bayambang', 'Binalonan', 'Binmaley', 'Bolinao', 'Bugallon', 'Burgos', 'Calasiao', 'Dagupan City', 'Dasol', 'Infanta', 'Labrador', 'Laoac', 'Lingayen', 'Mabini', 'Malasiqui', 'Manaoag', 'Mangaldan', 'Mangatarem', 'Mapandan', 'Natividad', 'Pozorrubio', 'Rosales', 'San Carlos City', 'San Fabian', 'San Jacinto', 'San Manuel', 'San Nicolas', 'San Quintin', 'Santa Barbara', 'Santa Maria', 'Santo Tomas', 'Sison', 'Sual', 'Tayug', 'Umingan', 'Urbiztondo', 'Urdaneta City', 'Villasis'],
};

const empty = { organization_type: "LGU", name: "", region: REGION, province: "", municipality: "" };

export default function AgencyLGURegistration() {
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const { data, error: queryError } = await supabase.from("agencies_lgus")
      .select("id, organization_type, name, region, province, municipality")
      .order("name");
    if (queryError) setError(queryError.message);
    else { setItems(data || []); setError(""); }
  }
  useEffect(() => { refresh(); }, []);
  const update = (key, value) => setForm((prev) => ({
    ...prev,
    [key]: value,
    ...(key === "province" ? { municipality: "" } : {}),
  }));
  const clear = () => { setForm(empty); setEditingId(null); setNotice(""); setError(""); };

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      if (!payload.name || !payload.organization_type) throw new Error("Organization type and name are required.");
      if (!LOCATIONS[payload.province]) throw new Error("Please select a province in Region I.");
      if (!LOCATIONS[payload.province].includes(payload.municipality)) throw new Error("Please select a city or municipality under the chosen province.");
      payload.region = REGION;
      let result;
      if (editingId) {
        result = await supabase.from("agencies_lgus").update(payload).eq("id", editingId).select("id").single();
      } else {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth?.user) throw new Error("Please sign in again.");
        result = await supabase.from("agencies_lgus").insert({ ...payload, created_by: auth.user.id }).select("id").single();
      }
      if (result.error) throw result.error;
      clear();
      setNotice(editingId ? "Organization updated successfully." : "Organization registered successfully.");
      await refresh();
    } catch (err) { setError(err.message || "Unable to save organization."); }
    finally { setLoading(false); }
  }
  function edit(item) {
    setEditingId(item.id);
    setForm({ organization_type: item.organization_type, name: item.name, region: REGION, province: LOCATIONS[item.province] ? item.province : "", municipality: LOCATIONS[item.province]?.includes(item.municipality) ? item.municipality : "" });
    setNotice(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    setError(""); setNotice("");
    const { error: deleteError } = await supabase.from("agencies_lgus").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Organization deleted."); await refresh(); }
  }

  return <main className="agency-page">
    <header className="agency-page-header">
      <p className="agency-eyebrow">AMIANAN–CADP L.E.N.S.</p>
      <h1>Registration of Agency or LGU</h1>
      <p>Register and manage agencies or local government units.</p>
    </header>
    <section className="agency-content">
      <form className="agency-form" onSubmit={handleSubmit}>
        <div className="agency-section-heading"><h2>Registration Details</h2><p>Enter the agency or LGU information below.</p></div>
        <div className="agency-grid">
          <label>Organization Type <span>*</span><select value={form.organization_type} onChange={(e) => update("organization_type", e.target.value)} required><option value="LGU">LGU</option><option value="Agency">Agency</option></select></label>
          <label>Agency / LGU Name <span>*</span><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Enter agency or LGU name" required maxLength={200}/></label>
          <label>Region<input value={REGION} readOnly aria-readonly="true" /></label>
          <label>Province <span>*</span><select value={form.province} onChange={(e) => update("province", e.target.value)} required><option value="">Select province</option>{Object.keys(LOCATIONS).map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
          <label>City / Municipality <span>*</span><select value={form.municipality} onChange={(e) => update("municipality", e.target.value)} disabled={!form.province} required><option value="">{form.province ? "Select city or municipality" : "Select a province first"}</option>{(LOCATIONS[form.province] || []).map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}</select></label>
        </div>
        {error && <p className="agency-error" role="alert">{error}</p>}
        {notice && <p className="agency-success" role="status">{notice}</p>}
        <div className="agency-actions"><button type="button" className="agency-clear" onClick={clear}>Clear</button><button type="submit" disabled={loading}>{loading ? "Saving..." : editingId ? "Save Changes" : "+ Register Agency / LGU"}</button></div>
      </form>
      <section className="agency-list"><div className="agency-section-heading"><h2>Registered Agencies / LGUs</h2><p>{items.length} registered organizations</p></div>
        <div className="agency-table-wrap"><table><thead><tr><th>Type</th><th>Agency / LGU Name</th><th>Region</th><th>Province</th><th>City / Municipality</th><th>Actions</th></tr></thead><tbody>{items.length ? items.map(item => <tr key={item.id}><td>{item.organization_type}</td><td>{item.name}</td><td>{item.region || "—"}</td><td>{item.province || "—"}</td><td>{item.municipality || "—"}</td><td><button type="button" className="agency-edit" onClick={() => edit(item)}>Edit</button> <button type="button" className="agency-delete" onClick={() => remove(item)}>Delete</button></td></tr>) : <tr><td colSpan="6">No registered organizations yet.</td></tr>}</tbody></table></div>
      </section>
    </section>
  </main>;
}
