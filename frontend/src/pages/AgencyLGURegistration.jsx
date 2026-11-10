import { useState } from "react";
import "./AgencyLGURegistration.css";

const initialForm = { type: "LGU", name: "", region: "", province: "", municipality: "" };

function BuildingIcon({ size = 25 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 21v-5h6v5M8 7h1m6 0h1M8 11h1m6 0h1" />
    </svg>
  );
}
function PinIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}
function MapIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>;
}
function NameIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 9h4M7 13h8m-8 3h5"/></svg>;
}

export default function AgencyLGURegistration() {
  const [form, setForm] = useState(initialForm);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const clear = () => setForm({ ...initialForm });

  function handleSubmit(event) {
    event.preventDefault();
    // This is a UI-only form until a Super Admin-authorized API is connected.
    window.alert("Registration API is not connected yet. No record was saved.");
  }

  return (
    <main className="agency-page">
      <div className="agency-page-content">
        <p className="agency-eyebrow">AMIANAN–CADP L.E.N.S.</p>
        <div className="agency-page-heading">
          <span className="agency-title-icon"><BuildingIcon size={29} /></span>
          <div>
            <h1>Registration of Agency or LGU</h1>
            <p className="agency-subtitle">Super Admin • Register an agency or local government unit.</p>
          </div>
        </div>

        <form className="agency-form" onSubmit={handleSubmit}>
          <div className="agency-form-banner"><h2>Registration Details</h2></div>
          <div className="agency-form-body">
            <div className="agency-grid">
              <label className="agency-field">
                <span className="agency-label"><BuildingIcon size={20}/> Organization Type <span className="agency-required">*</span></span>
                <select required value={form.type} onChange={update("type")}>
                  <option value="LGU">LGU</option>
                  <option value="Agency">Agency</option>
                </select>
              </label>
              <label className="agency-field">
                <span className="agency-label"><NameIcon/> Agency / LGU Name <span className="agency-required">*</span></span>
                <input required value={form.name} onChange={update("name")} placeholder="Enter agency or LGU name" />
              </label>
              <label className="agency-field">
                <span className="agency-label"><PinIcon/> Region <span className="agency-required">*</span></span>
                <input required value={form.region} onChange={update("region")} placeholder="Enter region" />
              </label>
              <label className="agency-field">
                <span className="agency-label"><MapIcon/> Province <span className="agency-required">*</span></span>
                <input required value={form.province} onChange={update("province")} placeholder="Enter province" />
              </label>
              <label className="agency-field">
                <span className="agency-label"><PinIcon/> City / Municipality <span className="agency-required">*</span></span>
                <input required value={form.municipality} onChange={update("municipality")} placeholder="Enter city or municipality" />
              </label>
            </div>
            <div className="agency-actions">
              <button className="agency-clear-button" type="button" onClick={clear}><span aria-hidden="true">×</span> Clear</button>
              <button className="agency-submit-button" type="submit"><BuildingIcon size={19}/> Register Agency / LGU</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
