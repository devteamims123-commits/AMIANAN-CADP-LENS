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
      const [sitesResult, programsResult] =
        await Promise.all([
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

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSite =
        filteredSiteIds.has(record.cadp_site_id);

      if (!matchesSite) {
        return false;
      }

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
  }, [records, filteredSiteIds, period]);

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
        String(record.status).toLowerCase() ===
        "ongoing"
    ).length;
  }, [filteredRecords]);

  const statusData = useMemo(() => {
    const counts = {};

    filteredRecords.forEach((record) => {
      const status = record.status || "Unspecified";

      counts[status] = (counts[status] || 0) + 1;
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

  const siteSummary = useMemo(() => {
    return filteredSites
      .map((site) => {
        const siteRecords = filteredRecords.filter(
          (record) =>
            record.cadp_site_id === site.id
        );

        const financial = siteRecords.reduce(
          (total, record) =>
            total +
            (Number(record.financial_target) || 0),
          0
        );

        let withTarget = 0;
        let withoutTarget = 0;

        siteRecords.forEach((record) => {
          if (period === "all") {
            const hasTarget = TARGET_PERIODS.some(
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

            if (hasTarget) {
              withTarget += 1;
            } else {
              withoutTarget += 1;
            }
          } else {
            const value = record[period];

            if (
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ""
            ) {
              withTarget += 1;
            } else {
              withoutTarget += 1;
            }
          }
        });

        return {
          ...site,
          programCount: siteRecords.length,
          financial,
          withTarget,
          withoutTarget,
        };
      })
      .sort(
        (a, b) =>
          b.programCount - a.programCount
      );
  }, [filteredSites, filteredRecords, period]);

  const maxStatusValue = Math.max(
    ...statusData.map((item) => item.value),
    1
  );

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

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            AMIANAN-CADP L.E.N.S.
          </p>

          <h1>Dashboard</h1>

          <p>
            Overview of CADP sites, programs,
            projects, physical targets, and funding.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh"
          onClick={loadDashboard}
        >
          Refresh Data
        </button>
      </header>

      {errorMessage && (
        <div className="dashboard-error">
          {errorMessage}
        </div>
      )}

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

      <section className="dashboard-cards">
        <article className="dashboard-card">
          <span>CADP Sites</span>

          <strong>
            {filteredSites.length}
          </strong>

          <small>
            Registered sites
          </small>
        </article>

        <article className="dashboard-card">
          <span>
            Programs / Projects
          </span>

          <strong>
            {filteredRecords.length}
          </strong>

          <small>
            {selectedPeriodLabel}
          </small>
        </article>

        <article className="dashboard-card">
          <span>Ongoing</span>

          <strong>
            {ongoingCount}
          </strong>

          <small>
            Active programs / projects
          </small>
        </article>

        <article className="dashboard-card">
          <span>
            Financial Target
          </span>

          <strong className="dashboard-money">
            ₱
            {formatCompactMoney(
              totalFinancialTarget
            )}
          </strong>

          <small>
            Total target funding
          </small>
        </article>
      </section>

      <section className="dashboard-chart-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>
                Programs / Projects by Status
              </h2>

              <p>
                Distribution of records by status.
              </p>
            </div>
          </div>

          <div className="dashboard-bars">
            {statusData.length === 0 ? (
              <div className="dashboard-no-data">
                No data available.
              </div>
            ) : (
              statusData.map((item) => (
                <div
                  className="dashboard-bar-row"
                  key={item.label}
                >
                  <div className="dashboard-bar-info">
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.value}
                    </strong>
                  </div>

                  <div className="dashboard-bar-track">
                    <div
                      className="dashboard-bar-fill"
                      style={{
                        width: `${
                          (item.value /
                            maxStatusValue) *
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
                    <span>
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
                <div className="dashboard-bar-info dashboard-financial-info">
                  <span>
                    {site.convergence_name}
                  </span>

                  <strong>
                    {formatMoney(
                      site.financial
                    )}
                  </strong>
                </div>

                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
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

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>
              Physical Target Summary
            </h2>

            <p>
              Target availability for{" "}
              <strong>
                {selectedPeriodLabel}
              </strong>
              .
            </p>
          </div>
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
                        {site.convergence_name}
                      </strong>
                    </td>

                    <td>
                      {site.province}
                    </td>

                    <td>
                      {site.programCount}
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