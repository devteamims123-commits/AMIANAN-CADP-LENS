import { useMemo, useState } from "react";
import "./ProgramsProjects.css";

const years = ["2025–2026", "2026–2027", "2027–2028", "2028–2029"];

const sites = ["Vintar", "Laoag City", "Bacarra"];

const records = [
  {
    id: 1,
    site: "Vintar",
    intervention: "Improvement (Concreting) of farm to-market roads in various barangays",
    kpi: "Length of roads concreted",
    targets: ["10km", "10km", "10km", "10km"],
    remarks: "Prioritize farmer groups in upland barangays.",
  },
  {
    id: 2,
    site: "Vintar",
    intervention: "Construction of Bridges (Alsem Dipilat, Cabayo, Lipay)",
    kpi: "Number of bridges established; Length of bridges established",
    targets: ["1 concrete bridge; 250m", " ", "1 concrete bridge; 250m", "1 concrete bridge; 250m"],
    remarks: "Coordinate construction schedule with the irrigators' association.",
  },
  {
    id: 3,
    site: "Vintar",
    intervention: "Construction of Solar powered irrigation projects",
    kpi: "Number of Solar powered irrigation projects constructed",
    targets: ["3 units", "3 units", "3 units", "3 units"],
    remarks: "Sample record for layout demonstration.",
  },
  {
    id: 4,
    site: "Laoag City",
    intervention: "Improve post-harvest handling through shared drying equipment and product quality training.",
    kpi: "Farmers using improved post-harvest facilities",
    targets: ["25 farmers", "40 farmers", "55 farmers", "70 farmers"],
    remarks: "Link participating cooperatives with local markets.",
  },
  {
    id: 5,
    site: "Laoag City",
    intervention: "Support urban community gardens with planting materials, tools, and practical crop management sessions.",
    kpi: "Community gardens with active production cycles",
    targets: ["4 gardens", "6 gardens", "8 gardens", "10 gardens"],
    remarks: "Sample record for layout demonstration.",
  },
];

function ExpandableText({ children }) {
  return (
    <details className="programs-expandable-text">
      <summary>{children}</summary>
      <p>{children}</p>
    </details>
  );
}

function ProgramsProjects() {
  const [selectedSite, setSelectedSite] = useState("Vintar");
  const [search, setSearch] = useState("");

  const siteRecords = useMemo(
    () => records.filter((record) => record.site === selectedSite),
    [selectedSite],
  );
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return siteRecords;

    return siteRecords.filter((record) =>
      [record.intervention, record.kpi, ...record.targets, record.remarks]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, siteRecords]);

  return (
    <div className="programs-page">
      <header className="module-header programs-header">
        <p className="module-eyebrow">AMIANAN-CADP L.E.N.S.</p>
        <h1>Programs and Projects</h1>
        <p className="programs-selected-site">Selected Site: <strong>{selectedSite}</strong></p>
      </header>

      <section className="programs-content" aria-label="Programs and Projects records">
        <div className="programs-toolbar">
          <label className="programs-site-field">
            <span>Site</span>
            <select value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>
              {sites.map((site) => <option key={site} value={site}>{site}</option>)}
            </select>
          </label>
          <label className="programs-search-field">
            <span>Search records</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activities, KPIs, or remarks"
            />
          </label>
          <p className="programs-result-count" aria-live="polite">
            {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
          </p>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="programs-table-scroll">
            <table className="programs-table">
              <colgroup>
                <col className="programs-column-intervention" />
                <col className="programs-column-kpi" />
                {years.map((year) => <col className="programs-column-target" key={year} />)}
                <col className="programs-column-remarks" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Proposed Inputs, Activities, and Interventions</th>
                  <th scope="col">KPI</th>
                  <th scope="colgroup" colSpan={years.length} className="programs-target-group">
                    <div>Physical Target</div>
                    <div className="programs-target-years">
                      {years.map((year) => <span key={year}>{year}</span>)}
                    </div>
                  </th>
                  <th scope="col">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="programs-intervention"><ExpandableText>{record.intervention}</ExpandableText></td>
                    <td>{record.kpi}</td>
                    {record.targets.map((target, index) => <td className="programs-target" key={years[index]}>{target}</td>)}
                    <td>{record.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="programs-empty-state">
            <span className="programs-empty-mark" aria-hidden="true">—</span>
            <h2>{siteRecords.length ? "No matching records" : `No Programs and Projects for ${selectedSite}`}</h2>
            <p>{siteRecords.length ? "Try another search term." : "There are no sample records for this site yet."}</p>
          </div>
        )}
        
      </section>
    </div>
  );
}

export default ProgramsProjects;