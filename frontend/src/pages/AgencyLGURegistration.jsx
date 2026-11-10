import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "./AgencyLGURegistration.css";

const empty = { organization_type: "LGU", name: "", region: "", province: "", municipality: "" };

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
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const clear = () => { setForm(empty); setEditingId(null); setNotice(""); setError(""); };

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      if (!payload.name || !payload.organization_type) throw new Error("Organization type and name are required.");
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
    setForm({ organization_type: item.organization_type, name: item.name, region: item.region || "", province: item.province || "", municipality: item.municipality || "" });
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
          <label>Region<input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Enter region" /></label>
          <label>Province<input value={form.province} onChange={(e) => update("province", e.target.value)} placeholder="Enter province" /></label>
          <label>City / Municipality<input value={form.municipality} onChange={(e) => update("municipality", e.target.value)} placeholder="Enter city or municipality" /></label>
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
