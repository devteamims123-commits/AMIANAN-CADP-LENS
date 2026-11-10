import { useState } from "react";
import "./AgencyLGURegistration.css";

const initialValues = {
  type: "LGU",
  name: "",
  region: "",
  province: "",
  municipality: "",
};

export default function AgencyLGURegistration() {
  const [form, setForm] = useState(initialValues);
  const update = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    // Connect to a Super Admin-authorized API with server-side role checks.
    // Do not claim the record was saved until the server confirms it.
    window.alert("Registration API is not connected yet. No record was saved.");
  }

  function handleClear() {
    setForm({ ...initialValues });
  }

  return (
    <div className="agency-page">
      <section className="agency-heading">
        <p className="agency-eyebrow">AMIANAN–CADP L.E.N.S.</p>
        <h1>Registration of Agency or LGU</h1>
        <p className="agency-subtitle">
          Register and manage agencies or local government units.
        </p>
      </section>

      <section className="agency-content">
        <form className="agency-form" onSubmit={handleSubmit}>
          <div className="agency-form-header">
            <div>
              <h2>Registration Details</h2>
              <p>Enter the agency or LGU information below.</p>
            </div>
          </div>

          <div className="agency-grid">
            <label>
              Organization Type <span className="agency-required">*</span>
              <select required value={form.type} onChange={update("type")}>
                <option value="LGU">LGU</option>
                <option value="Agency">Agency</option>
              </select>
            </label>
            <label>
              Agency / LGU Name <span className="agency-required">*</span>
              <input required value={form.name} onChange={update("name")} placeholder="Enter agency or LGU name" />
            </label>
            <label>
              Region
              <input value={form.region} onChange={update("region")} placeholder="Enter region" />
            </label>
            <label>
              Province
              <input value={form.province} onChange={update("province")} placeholder="Enter province" />
            </label>
            <label>
              City / Municipality
              <input value={form.municipality} onChange={update("municipality")} placeholder="Enter city or municipality" />
            </label>
          </div>

          <div className="agency-actions">
            <button className="agency-clear" type="button" onClick={handleClear}>Clear</button>
            <button className="agency-submit" type="submit">+ Register Agency / LGU</button>
          </div>
        </form>
      </section>
    </div>
  );
}
