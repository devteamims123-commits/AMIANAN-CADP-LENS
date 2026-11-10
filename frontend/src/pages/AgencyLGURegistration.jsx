import { useState } from "react";
import "./AgencyLGURegistration.css";

export default function AgencyLGURegistration() {
  const [type, setType] = useState("LGU");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // Connect this form to a Super Admin-authorized backend endpoint.
    // Do not claim registration succeeded until the API confirms it.
    window.alert("Registration API is not connected yet. No record was saved.");
  }

  return (
    <main className="agency-page">
      <p className="agency-eyebrow">AMIANAN–CADP L.E.N.S.</p>
      <h1>Registration of Agency or LGU</h1>
      <p className="agency-subtitle">Super Admin • Register an agency or local government unit.</p>
      <form className="agency-form" onSubmit={handleSubmit}>
        <h2>Registration Details</h2>
        <div className="agency-grid">
          <label>Organization Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="LGU">LGU</option>
              <option value="Agency">Agency</option>
            </select>
          </label>
          <label>Agency / LGU Name
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
          </label>
          <label>Region
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Enter region" />
          </label>
          <label>Province
            <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Enter province" />
          </label>
          <label>City / Municipality
            <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Enter city or municipality" />
          </label>
        </div>
        <div className="agency-actions"><button type="submit">Register Agency / LGU</button></div>
      </form>
    </main>
  );
}
