import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./Dashboard.css";

const TARGET_PERIODS = [
  {
    label: "2025–2026",
    field: "physical_target_2025_2026",
  },
  {
    label: "2026–2027",
    field: "physical_target_2026_2027",
  },
  {
    label: "2027–2028",
    field: "physical_target_2027_2028",
  },
  {
    label: "2028–2029",
    field: "physical_target_2028_2029",
  },
];

const STATUS_ORDER = [
  "Proposed",
  "Ongoing",
  "Completed",
  "On Hold",
  "Cancelled",
];

const STATUS_COLORS = {
  Proposed: "#d6b84b",
  Ongoing: "#2f7d4a",
  Completed: "#174d2d",
  "On Hold": "#c98b37",
  Cancelled: "#9b5a52",
  Unspecified: "#9aa79d",
};

function Dashboard() {
  const [sites, setSites] = useState([]);
  const [records, setRecords] = useState([]);

  const [province, setProvince] = useState("all");
  const [siteId, setSiteId] = useState("all");
  const [period, setPeriod] = useState("all");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [sitesResult, programsResult] = await Promise.all([
        supabase
          .from("cadp_sites")
          .select(
            "id, convergence_name, province, municipality_city, barangay"
          )
          .order("convergence_name"),

        supabase
          .from("programs_projects")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (sitesResult.error) {
        throw sitesResult.error;
      }

      if (programsResult.error) {
        throw programsResult.error;
      }

      setSites(sitesResult.data || []);
      setRecords(programsResult.data || []);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message || "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const provinces = useMemo(() => {
    return [
      ...new Set(
        sites
          .map((site) => site.province)
          .filter(Boolean)
      ),
    ].sort();
  }, [sites]);

  const availableSites = useMemo(() => {
    if (province === "all") {
      return sites;
    }

    return sites.filter(
      (site) => site.province === province
    );
  }, [sites, province]);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesProvince =
        province === "all" ||
        site.province === province;

      const matchesSite =
        siteId === "all" ||
        site.id === siteId;

      return matchesProvince && matchesSite;
    });
  }, [sites, province, siteId]);

  const filteredSiteIds = useMemo(() => {
    return new Set(
      filteredSites.map((site) => site.id)
    );
  }, [filteredSites]);

  /*
   * All records belonging to the selected province/site.
   *
   * This is intentionally kept separate from filteredRecords.
   * It lets the Physical Target Summary count programs that
   * DO NOT have a target for the selected year.
   */
  const siteFilteredRecords = useMemo(() => {
    return records.filter((record) =>
      filteredSiteIds.has(record.cadp_site_id)
    );
  }, [records, filteredSiteIds]);

  /*
   * Records displayed in KPI cards and charts.
   * If a physical target year is selected, only programs
   * containing a target for that year are included.
   */
  const filteredRecords = useMemo(() => {
    return siteFilteredRecords.filter((record) => {
      if (period === "all") {
        return true;
      }

      const target = record[period];

      return (
        target !== null &&
        target !== undefined &&
        String(target).trim() !== ""
      );
    });
  }, [siteFilteredRecords, period]);

  const totalFinancialTarget = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) =>
        total +
        (Number(record.financial_target) || 0),
      0
    );
  }, [filteredRecords]);

  const ongoingCount = useMemo(() => {
    return filteredRecords.filter(
      (record) =>
        String(record.status || "").toLowerCase() ===
        "ongoing"
    ).length;
  }, [filteredRecords]);

  const statusData = useMemo(() => {
    const counts = {};

    filteredRecords.forEach((record) => {
      const status =
        record.status || "Unspecified";

      counts[status] =
        (counts[status] || 0) + 1;
    });

    const known = STATUS_ORDER
      .filter((status) => counts[status])
      .map((status) => ({
        label: status,
        value: counts[status],
      }));

    const others = Object.entries(counts)
      .filter(
        ([status]) =>
          !STATUS_ORDER.includes(status)
      )
      .map(([status, value]) => ({
        label: status,
        value,
      }));

    return [...known, ...others];
  }, [filteredRecords]);

  /*
   * Physical Target Summary FIX:
   * siteRecords comes from siteFilteredRecords instead of
   * filteredRecords, so "Without Target" remains accurate
   * when a specific target year is selected.
   */
  const siteSummary = useMemo(() => {
    return filteredSites
      .map((site) => {
        const allSiteRecords =
          siteFilteredRecords.filter(
            (record) =>
              record.cadp_site_id === site.id
          );

        const displayedSiteRecords =
          filteredRecords.filter(
            (record) =>
              record.cadp_site_id === site.id
          );

        const financial =
          displayedSiteRecords.reduce(
            (total, record) =>
              total +
              (Number(record.financial_target) || 0),
            0
          );

        let withTarget = 0;
        let withoutTarget = 0;

        allSiteRecords.forEach((record) => {
          let hasTarget = false;

          if (period === "all") {
            hasTarget = TARGET_PERIODS.some(
              (targetPeriod) => {
                const value =
                  record[targetPeriod.field];

                return (
                  value !== null &&
                  value !== undefined &&
                  String(value).trim() !== ""
                );
              }
            );
          } else {
            const value = record[period];

            hasTarget =
              value !== null &&
              value !== undefined &&
              String(value).trim() !== "";
          }

          if (hasTarget) {
            withTarget += 1;
          } else {
            withoutTarget += 1;
          }
        });

        return {
          ...site,
          programCount:
            displayedSiteRecords.length,
          totalPrograms: allSiteRecords.length,
          financial,
          withTarget,
          withoutTarget,
        };
      })
      .sort(
        (a, b) =>
          b.programCount - a.programCount
      );
  }, [
    filteredSites,
    siteFilteredRecords,
    filteredRecords,
    period,
  ]);

  const maxProgramCount = Math.max(
    ...siteSummary.map(
      (site) => site.programCount
    ),
    1
  );

  const maxFinancial = Math.max(
    ...siteSummary.map(
      (site) => site.financial
    ),
    1
  );

  const formatMoney = (value) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatCompactMoney = (value) => {
    return new Intl.NumberFormat("en-PH", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value || 0);
  };

  const selectedPeriodLabel =
    period === "all"
      ? "All Years"
      : TARGET_PERIODS.find(
          (item) => item.field === period
        )?.label || "";

  const handleProvinceChange = (value) => {
    setProvince(value);
    setSiteId("all");
  };

  /*
   * Create a conic-gradient from the real status counts.
   * No chart library is required.
   */
  const donutBackground = useMemo(() => {
    const total = statusData.reduce(
      (sum, item) => sum + item.value,
      0
    );

    if (!total) {
      return "#e8eee9";
    }

    let current = 0;

    const segments = statusData.map(
      (item, index) => {
        const start = current;
        const percentage =
          (item.value / total) * 100;

        current += percentage;

        const color =
          STATUS_COLORS[item.label] ||
          [
            "#225c36",
            "#d6b84b",
            "#78967f",
            "#b98542",
            "#6e806f",
          ][index % 5];

        return `${color} ${start}% ${current}%`;
      }
    );

    return `conic-gradient(${segments.join(
      ", "
    )})`;
  }, [statusData]);

  const totalStatusRecords = statusData.reduce(
    (total, item) => total + item.value,
    0
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-loader" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <p className="dashboard-eyebrow">
            AMIANAN-CADP L.E.N.S.
          </p>

          <h1>Dashboard</h1>

          <p className="dashboard-subtitle">
            Overview of CADP sites, programs,
            projects, physical targets, and funding.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh"
          onClick={loadDashboard}
        >
          <span className="dashboard-refresh-icon">
            ↻
          </span>
          Refresh Data
        </button>
      </header>

      {errorMessage && (
        <div className="dashboard-error">
          {errorMessage}
        </div>
      )}

      {/* FILTERS */}
      <section className="dashboard-filters">
        <label>
          <span>Province</span>

          <select
            value={province}
            onChange={(event) =>
              handleProvinceChange(
                event.target.value
              )
            }
          >
            <option value="all">
              All Provinces
            </option>

            {provinces.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>CADP Site</span>

          <select
            value={siteId}
            onChange={(event) =>
              setSiteId(event.target.value)
            }
          >
            <option value="all">
              All CADP Sites
            </option>

            {availableSites.map((site) => (
              <option
                key={site.id}
                value={site.id}
              >
                {site.convergence_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Physical Target Year</span>

          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value)
            }
          >
            <option value="all">
              All Years
            </option>

            {TARGET_PERIODS.map(
              (targetPeriod) => (
                <option
                  key={targetPeriod.field}
                  value={targetPeriod.field}
                >
                  {targetPeriod.label}
                </option>
              )
            )}
          </select>
        </label>
      </section>

      {/* KPI CARDS */}
      <section className="dashboard-cards">
        <article className="dashboard-card">
          <div className="dashboard-card-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 20V8l8-4 8 4v12h-5v-6H9v6H4Zm2-2h1v-6h10v6h1V9.2l-6-3-6 3V18Z" />
            </svg>
          </div>

          <div className="dashboard-card-content">
            <span>CADP Sites</span>

            <strong>
              {filteredSites.length}
            </strong>

            <small>Registered sites</small>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h14V5H5Zm3 3h8v2H8V8Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z" />
            </svg>
          </div>

          <div className="dashboard-card-content">
            <span>
              Programs / Projects
            </span>

            <strong>
              {filteredRecords.length}
            </strong>

            <small>
              {selectedPeriodLabel}
            </small>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m4 17 5-5 3 3 6-7h-4V6h7v7h-2V9.7l-6.9 8.1-3.1-3.1-3.6 3.7L4 17Z" />
            </svg>
          </div>

          <div className="dashboard-card-content">
            <span>Ongoing</span>

            <strong>{ongoingCount}</strong>

            <small>
              Active programs / projects
            </small>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-icon">
            <span className="dashboard-peso">
              ₱
            </span>
          </div>

          <div className="dashboard-card-content">
            <span>Financial Target</span>

            <strong className="dashboard-money">
              ₱
              {formatCompactMoney(
                totalFinancialTarget
              )}
            </strong>

            <small>
              Total target funding
            </small>
          </div>
        </article>
      </section>

      {/* MAIN CHARTS */}
      <section className="dashboard-chart-grid">
        {/* STATUS DONUT */}
        <article className="dashboard-panel dashboard-status-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>
                Programs / Projects by Status
              </h2>

              <p>
                Distribution of records by status.
              </p>
            </div>

            <span className="dashboard-panel-badge">
              {selectedPeriodLabel}
            </span>
          </div>

          {statusData.length === 0 ? (
            <div className="dashboard-no-data">
              No data available.
            </div>
          ) : (
            <div className="dashboard-donut-layout">
              <div
                className="dashboard-donut"
                style={{
                  background: donutBackground,
                }}
              >
                <div className="dashboard-donut-center">
                  <strong>
                    {totalStatusRecords}
                  </strong>
                  <span>Total</span>
                </div>
              </div>

              <div className="dashboard-legend">
                {statusData.map(
                  (item, index) => (
                    <div
                      className="dashboard-legend-row"
                      key={item.label}
                    >
                      <div className="dashboard-legend-label">
                        <span
                          className="dashboard-legend-dot"
                          style={{
                            background:
                              STATUS_COLORS[
                                item.label
                              ] ||
                              [
                                "#225c36",
                                "#d6b84b",
                                "#78967f",
                                "#b98542",
                                "#6e806f",
                              ][index % 5],
                          }}
                        />

                        <span>
                          {item.label}
                        </span>
                      </div>

                      <strong>
                        {item.value}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </article>

        {/* CADP SITE BARS */}
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>
                Programs / Projects by CADP Site
              </h2>

              <p>
                Number of records per CADP site.
              </p>
            </div>
          </div>

          <div className="dashboard-bars">
            {siteSummary.length === 0 ? (
              <div className="dashboard-no-data">
                No data available.
              </div>
            ) : (
              siteSummary.map((site) => (
                <div
                  className="dashboard-bar-row"
                  key={site.id}
                >
                  <div className="dashboard-bar-info">
                    <span
                      title={
                        site.convergence_name
                      }
                    >
                      {site.convergence_name}
                    </span>

                    <strong>
                      {site.programCount}
                    </strong>
                  </div>

                  <div className="dashboard-bar-track">
                    <div
                      className="dashboard-bar-fill"
                      style={{
                        width: `${
                          (site.programCount /
                            maxProgramCount) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {/* FINANCIAL TARGET */}
      <section className="dashboard-panel dashboard-financial-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>
              Financial Target by CADP Site
            </h2>

            <p>
              Total financial target of programs
              and projects per site.
            </p>
          </div>

          <div className="dashboard-financial-total">
            <span>Total</span>
            <strong>
              {formatMoney(
                totalFinancialTarget
              )}
            </strong>
          </div>
        </div>

        <div className="dashboard-bars dashboard-financial-bars">
          {siteSummary.length === 0 ? (
            <div className="dashboard-no-data">
              No data available.
            </div>
          ) : (
            siteSummary.map((site) => (
              <div
                className="dashboard-bar-row"
                key={site.id}
              >
                <div className="dashboard-bar-info dashboard-financial-info">
                  <span
                    title={
                      site.convergence_name
                    }
                  >
                    {site.convergence_name}
                  </span>

                  <strong>
                    {formatMoney(
                      site.financial
                    )}
                  </strong>
                </div>

                <div className="dashboard-bar-track dashboard-financial-track">
                  <div
                    className="dashboard-bar-fill dashboard-financial-fill"
                    style={{
                      width: `${
                        (site.financial /
                          maxFinancial) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* PHYSICAL TARGET SUMMARY */}
      <section className="dashboard-panel dashboard-target-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>
              Physical Target Summary
            </h2>

            <p>
              Target availability across selected
              CADP sites.
            </p>
          </div>

          <span className="dashboard-panel-badge">
            {selectedPeriodLabel}
          </span>
        </div>

        <div className="dashboard-table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>CADP Site</th>
                <th>Province</th>
                <th>
                  Programs / Projects
                </th>
                <th>With Target</th>
                <th>Without Target</th>
              </tr>
            </thead>

            <tbody>
              {siteSummary.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="dashboard-table-empty"
                  >
                    No data available.
                  </td>
                </tr>
              ) : (
                siteSummary.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <strong>
                        {
                          site.convergence_name
                        }
                      </strong>
                    </td>

                    <td>
                      {site.province || "—"}
                    </td>

                    <td>
                      {period === "all"
                        ? site.totalPrograms
                        : site.totalPrograms}
                    </td>

                    <td>
                      <span className="dashboard-target-yes">
                        {site.withTarget}
                      </span>
                    </td>

                    <td>
                      <span className="dashboard-target-no">
                        {site.withoutTarget}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;