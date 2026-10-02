import { useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { region1Locations } from "../data/region1Locations";
import "./CADPSiteRegistration.css";

const initialForm = { province: "", municipalityCity: "", barangay: "", yearStarted: "", convergenceName: "" };

function CADPSiteRegistration() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const provinces = Object.keys(region1Locations);
  const municipalities = useMemo(() => form.province ? Object.keys(region1Locations[form.province] || {}) : [], [form.province]);
  const barangays = useMemo(() => form.province && form.municipalityCity ? region1Locations[form.province]?.[form.municipalityCity] || [] : [], [form.province, form.municipalityCity]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

  const update = (field, value) => {
    setMessage(""); setErrorMessage("");
    if (field === "province") return setForm((p) => ({ ...p, province: value, municipalityCity: "", barangay: "" }));
    if (field === "municipalityCity") return setForm((p) => ({ ...p, municipalityCity: value, barangay: "" }));
    setForm((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMessage(""); setErrorMessage("");
    if (!form.province || !form.municipalityCity || !form.barangay || !form.yearStarted || !form.convergenceName.trim()) {
      setErrorMessage("Please complete all fields."); return;
    }
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your session is unavailable. Please sign in again.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profileError) throw profileError;
      if (!["super_admin", "admin"].includes(profile?.role)) throw new Error("You are not authorized to register CADP sites.");
      const { error } = await supabase.from("cadp_sites").insert({ province: form.province, municipality_city: form.municipalityCity, barangay: form.barangay, year_started: Number(form.yearStarted), convergence_name: form.convergenceName.trim(), created_by: user.id });
      if (error) throw error;
      setForm(initialForm); setMessage("CADP site registered successfully.");
    } catch (error) { console.error(error); setErrorMessage(error.message || "Unable to register CADP site."); }
    finally { setSaving(false); }
  };

  return (
    <div className="cadp-page">
      <header className="cadp-header"><p>AMIANAN-CADP L.E.N.S.</p><h1>CADP Site Registration</h1><span>Register a new CADP site for the Convergence and Development Plan (CADP).</span></header>
      <div className="cadp-content">
        <form className="cadp-form-card" onSubmit={handleSubmit}>
          <div className="cadp-grid">
            <label><span>Province</span><select value={form.province} onChange={(e) => update("province", e.target.value)} required><option value="">Select Province</option>{provinces.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Municipality / City</span><select value={form.municipalityCity} onChange={(e) => update("municipalityCity", e.target.value)} disabled={!form.province} required><option value="">Select Municipality / City</option>{municipalities.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Barangay</span><select value={form.barangay} onChange={(e) => update("barangay", e.target.value)} disabled={!form.municipalityCity} required><option value="">Select Barangay</option>{barangays.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span>Year Started</span><select value={form.yearStarted} onChange={(e) => update("yearStarted", e.target.value)} required><option value="">Select Year</option>{years.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="cadp-full"><span>Convergence Name</span><input value={form.convergenceName} onChange={(e) => update("convergenceName", e.target.value)} placeholder="Enter convergence name" required /></label>
          </div>
          {errorMessage && <div className="cadp-message error">{errorMessage}</div>}
          {message && <div className="cadp-message success">{message}</div>}
          <div className="cadp-actions"><button type="button" className="cadp-cancel" onClick={() => setForm(initialForm)}>Clear</button><button type="submit" className="cadp-submit" disabled={saving}>{saving ? "Registering..." : "Register CADP Site"}</button></div>
          <p className="cadp-note">Available to Super Admin and Admin accounts. Location choices are limited to Region I.</p>
        </form>
      </div>
    </div>
  );
}
export default CADPSiteRegistration;
