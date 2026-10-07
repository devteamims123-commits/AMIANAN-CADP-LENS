import { useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";

import "./ProgramsProjects.css";



const TARGET_PERIODS = [

  {

    label: "2025–2026",

    year: "2025-2026",

    physicalField: "physical_target_2025_2026",

    financialField: "financial_target_2025_2026",

    physicalFormField: "physicalTarget2025_2026",

    financialFormField: "financialTarget2025_2026",

  },

  {

    label: "2026–2027",

    year: "2026-2027",

    physicalField: "physical_target_2026_2027",

    financialField: "financial_target_2026_2027",

    physicalFormField: "physicalTarget2026_2027",

    financialFormField: "financialTarget2026_2027",

  },

  {

    label: "2027–2028",

    year: "2027-2028",

    physicalField: "physical_target_2027_2028",

    financialField: "financial_target_2027_2028",

    physicalFormField: "physicalTarget2027_2028",

    financialFormField: "financialTarget2027_2028",

  },

  {

    label: "2028–2029",

    year: "2028-2029",

    physicalField: "physical_target_2028_2029",

    financialField: "financial_target_2028_2029",

    physicalFormField: "physicalTarget2028_2029",

    financialFormField: "financialTarget2028_2029",

  },

];



const STATUS_OPTIONS = [

  "Proposed",

  "Ongoing",

  "Completed",

  "On Hold",

  "Cancelled",

];



const initialForm = {

  cadpSiteId: "",

  intervention: "",

  kpi: "",

  sourceOfFund: "",

  status: "Proposed",



  physicalTarget2025_2026: "",

  physicalTarget2026_2027: "",

  physicalTarget2027_2028: "",

  physicalTarget2028_2029: "",



  financialTarget2025_2026: "",

  financialTarget2026_2027: "",

  financialTarget2027_2028: "",

  financialTarget2028_2029: "",

  remarks: "",

};



const initialFundingForm = {

  targetYear: "",

  fundingInstitution: "",

  amount: "",

};



function ProgramsProjects() {

  const [records, setRecords] = useState([]);

  const [sites, setSites] = useState([]);

  const [fundingContributions, setFundingContributions] = useState([]);

  const [currentProfile, setCurrentProfile] = useState(null);



  const [selectedSite, setSelectedSite] = useState("");

  const [selectedAgency, setSelectedAgency] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const [search, setSearch] = useState("");



  const [form, setForm] = useState(initialForm);

  const [editingId, setEditingId] = useState(null);



  const [showForm, setShowForm] = useState(false);



  const [showFundingForm, setShowFundingForm] = useState(false);

  const [fundingRecord, setFundingRecord] = useState(null);

  const [fundingForm, setFundingForm] = useState(initialFundingForm);



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [fundingSaving, setFundingSaving] = useState(false);



  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [fundingError, setFundingError] = useState("");





  const [editingContribution, setEditingContribution] = useState(null);

  const [deletingContributionId, setDeletingContributionId] = useState(null);

  const canFund = ["super_admin", "admin", "user"].includes(currentProfile?.role);

  const canEditContribution = (contribution, profile = currentProfile) => {

    if (!contribution || !profile) return false;

    if (["super_admin", "admin"].includes(profile.role)) return true;

    if (profile.role !== "user") return false;

    const agency = profile.agency?.trim().toLowerCase();

    const institution = contribution.funding_institution?.trim().toLowerCase();

    return Boolean(agency && agency === institution);

  };

  const fundingRequestError = (error) =>

    error.code === "42501"

      ? "Funding request blocked by database permissions. Apply the included funding_permissions.sql and confirm your account has an agency assigned."

      : error.message || "Unable to save funding contribution.";
  const canDelete = currentProfile?.role === "super_admin";

  const canEdit = (record, profile = currentProfile) => {

    if (!record || !profile) return false;

    if (["super_admin", "admin"].includes(profile.role)) return true;

    if (profile.role !== "user") return false;

    const agency = profile.agency?.trim().toLowerCase();

    const recordAgency = record.source_of_fund?.trim().toLowerCase();

    return Boolean(agency && agency === recordAgency);

  };
  useEffect(() => {

    loadData();

  }, []);



  async function loadData() {

    setLoading(true);

    setErrorMessage("");



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        throw new Error("Your session is unavailable. Please sign in again.");

      }



      const [sitesResult, recordsResult, fundingResult, profileResult] =

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



          supabase

            .from("project_funding_contributions")

            .select("*")

            .order("created_at", {

              ascending: false,

            }),



          supabase

            .from("profiles")

            .select("id, role, agency")

            .eq("id", user.id)

            .single(),

        ]);



      if (sitesResult.error) throw sitesResult.error;

      if (recordsResult.error) throw recordsResult.error;

      if (fundingResult.error) throw fundingResult.error;

      if (profileResult.error) throw profileResult.error;



      setSites(sitesResult.data || []);

      setRecords(recordsResult.data || []);

      setFundingContributions(fundingResult.data || []);

      setCurrentProfile(profileResult.data || null);

    } catch (error) {

      console.error(error);

      setErrorMessage(

        error.message || "Unable to load Programs and Projects."

      );

    } finally {

      setLoading(false);

    }

  }



  const selectedPeriodData =

    selectedPeriod === "all"

      ? null

      : TARGET_PERIODS.find(

          (period) => period.physicalField === selectedPeriod

        );



  const selectedPeriodLabel =

    selectedPeriod === "all"

      ? "All Years"

      : selectedPeriodData?.label || "";



  const agencyOptions = useMemo(() => {
    const agencies = new Map();
    fundingContributions.forEach((item) => {
      const agency = item.funding_institution?.trim();
      if (agency && !agencies.has(agency.toLowerCase())) agencies.set(agency.toLowerCase(), agency);
    });
    return Array.from(agencies, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [fundingContributions]);
  const selectedAgencyLabel = agencyOptions.find((item) => item.value === selectedAgency)?.label || "";

  const filteredRecords = useMemo(() => {

    const query = search.trim().toLowerCase();



    return records.filter((record) => {

      const matchesSite =

        !selectedSite || record.cadp_site_id === selectedSite;



      const matchesPeriod =

        selectedPeriod === "all" ||

        (selectedPeriodData &&

          (

            record[selectedPeriodData.physicalField] !== null ||

            record[selectedPeriodData.financialField] !== null

          ));



      const matchesSearch =

        !query ||

        [

          record.intervention,

          record.kpi,

          record.source_of_fund,

          record.status,

          record.physical_target_2025_2026,

          record.physical_target_2026_2027,

          record.physical_target_2027_2028,

          record.physical_target_2028_2029,

          record.financial_target_2025_2026,

          record.financial_target_2026_2027,

          record.financial_target_2027_2028,

          record.financial_target_2028_2029,

          record.remarks,

        ].some((value) =>

          String(value || "")

            .toLowerCase()

            .includes(query)

        );



      const matchesAgency = !selectedAgency || fundingContributions.some((item) =>
        item.program_project_id === record.id &&
        item.funding_institution?.trim().toLowerCase() === selectedAgency &&
        (!selectedPeriodData || item.target_year === selectedPeriodData.year)
      );
      return matchesSite && matchesPeriod && matchesSearch && matchesAgency;

    });

  }, [

    records,

    fundingContributions,

    selectedAgency,

    selectedSite,

    selectedPeriod,

    selectedPeriodData,

    search,

  ]);



  const updateForm = (field, value) => {

    setForm((previous) => ({

      ...previous,

      [field]: value,

    }));



    setErrorMessage("");

  };



  const openAddForm = () => {

    setEditingId(null);

    setForm({

      ...initialForm,

      sourceOfFund: currentProfile?.agency || "",

    });

    setMessage("");

    setErrorMessage("");

    setShowForm(true);

  };



  const openEditForm = (record) => {

    if (!canEdit(record)) {

      setErrorMessage("You can only edit your agency's records.");

      return;

    }
    setEditingId(record.id);



    setForm({

      cadpSiteId: record.cadp_site_id || "",

      intervention: record.intervention || "",

      kpi: record.kpi || "",

      sourceOfFund: record.source_of_fund || "",

      status: record.status || "Proposed",



      physicalTarget2025_2026:

        record.physical_target_2025_2026 || "",



      physicalTarget2026_2027:

        record.physical_target_2026_2027 || "",



      physicalTarget2027_2028:

        record.physical_target_2027_2028 || "",



      physicalTarget2028_2029:

        record.physical_target_2028_2029 || "",



      financialTarget2025_2026:

        record.financial_target_2025_2026 ?? "",



      financialTarget2026_2027:

        record.financial_target_2026_2027 ?? "",



      financialTarget2027_2028:

        record.financial_target_2027_2028 ?? "",



      financialTarget2028_2029:

        record.financial_target_2028_2029 ?? "",



      remarks: record.remarks || "",

    });



    setMessage("");

    setErrorMessage("");

    setShowForm(true);

  };



  const closeForm = () => {

    if (saving) return;



    setShowForm(false);

    setEditingId(null);

    setForm(initialForm);

    setErrorMessage("");

  };



  const parseAmount = (value, label) => {

    if (value === "") {

      return null;

    }



    const amount = Number(value);



    if (!Number.isFinite(amount) || amount < 0) {

      throw new Error(

        `${label} must be a valid non-negative amount.`

      );

    }



    return amount;

  };



  const handleSubmit = async (event) => {

    event.preventDefault();



    setSaving(true);

    setMessage("");

    setErrorMessage("");



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        throw new Error(

          "Your session is unavailable. Please sign in again."

        );

      }



      const { data: freshProfile, error: profileError } = await supabase

        .from("profiles")

        .select("id, role, agency")

        .eq("id", user.id)

        .single();

      if (profileError) throw profileError;

      if (!["super_admin", "admin", "user"].includes(freshProfile?.role)) {

        throw new Error("You are not allowed to save programs or projects.");

      }

      const editingRecord = editingId

        ? records.find((item) => item.id === editingId)

        : null;

      if (editingId && !canEdit(editingRecord, freshProfile)) {

        throw new Error("You can only edit your agency's records.");

      }
      if (

        !form.cadpSiteId ||

        !form.intervention.trim() ||

        !form.kpi.trim() ||

        !form.status

      ) {

        throw new Error(

          "Please complete all required fields."

        );

      }



      if (!editingId && !freshProfile?.agency?.trim()) {

        throw new Error(

          "Your account does not have an agency assigned. Please contact the system administrator."

        );

      }



      const financial2025 = parseAmount(

        form.financialTarget2025_2026,

        "2025–2026 Financial Target"

      );



      const financial2026 = parseAmount(

        form.financialTarget2026_2027,

        "2026–2027 Financial Target"

      );



      const financial2027 = parseAmount(

        form.financialTarget2027_2028,

        "2027–2028 Financial Target"

      );



      const financial2028 = parseAmount(

        form.financialTarget2028_2029,

        "2028–2029 Financial Target"

      );

      const payload = {

        cadp_site_id: form.cadpSiteId,

        intervention: form.intervention.trim(),

        kpi: form.kpi.trim(),

        source_of_fund: editingId

          ? editingRecord.source_of_fund

          : freshProfile.agency.trim(),

        status: form.status,



        physical_target_2025_2026:

          form.physicalTarget2025_2026.trim() || null,



        physical_target_2026_2027:

          form.physicalTarget2026_2027.trim() || null,



        physical_target_2027_2028:

          form.physicalTarget2027_2028.trim() || null,



        physical_target_2028_2029:

          form.physicalTarget2028_2029.trim() || null,



        financial_target_2025_2026: financial2025,

        financial_target_2026_2027: financial2026,

        financial_target_2027_2028: financial2027,

        financial_target_2028_2029: financial2028,

        remarks: form.remarks.trim() || null,



        updated_at: new Date().toISOString(),

      };



      if (editingId) {

        const { data: updatedRecord, error } = await supabase

          .from("programs_projects")

          .update(payload)

          .eq("id", editingId)

          .select("id")

          .maybeSingle();



        if (error) {

          throw error;

        }

        if (!updatedRecord) {

          throw new Error("Update denied or the record no longer exists.");
        }



        setMessage(

          "Program / Project updated successfully."

        );

      } else {

        const { error } = await supabase

          .from("programs_projects")

          .insert({

            ...payload,

            created_by: user.id,

          });



        if (error) {

          throw error;

        }



        setMessage(

          "Program / Project added successfully."

        );

      }



      setShowForm(false);

      setEditingId(null);

      setForm(initialForm);



      await loadData();

    } catch (error) {

      console.error(error);



      setErrorMessage(

        error.message ||

          "Unable to save Program / Project."

      );

    } finally {

      setSaving(false);

    }

  };



  const handleDelete = async (record) => {

    if (!canDelete) {

      setErrorMessage("Only Superadmin can delete records.");

      return;

    }
    const confirmed = window.confirm(

      "Are you sure you want to delete this Program / Project?"

    );



    if (!confirmed) {

      return;

    }



    setMessage("");

    setErrorMessage("");



    try {

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {

        throw new Error("Your session is unavailable. Please sign in again.");

      }

      const { data: freshProfile, error: profileError } = await supabase

        .from("profiles")

        .select("role")

        .eq("id", user.id)

        .single();

      if (profileError) throw profileError;

      if (freshProfile?.role !== "super_admin") {

        throw new Error("Only Superadmin can delete records.");

      }

      const { data: deletedRecord, error } = await supabase

        .from("programs_projects")

        .delete()

        .eq("id", record.id)

        .select("id")

        .maybeSingle();



      if (error) {

        throw error;

      }

      if (!deletedRecord) {

        throw new Error("Delete denied or the record no longer exists.");
      }



      setMessage(

        "Program / Project deleted successfully."

      );



      await loadData();

    } catch (error) {

      console.error(error);



      setErrorMessage(

        error.message ||

          "Unable to delete Program / Project."

      );

    }

  };



  const formatMoney = (value) => {

    if (

      value === null ||

      value === undefined ||

      value === ""

    ) {

      return "—";

    }



    return new Intl.NumberFormat("en-PH", {

      style: "currency",

      currency: "PHP",

      minimumFractionDigits: 2,

      maximumFractionDigits: 2,

    }).format(Number(value));

  };



  const getFundedAmount = (recordId, year) => {

    return fundingContributions

      .filter(

        (item) =>

          item.program_project_id === recordId &&

          item.target_year === year

      )

      .reduce(

        (total, item) =>

          total + Number(item.amount || 0),

        0

      );

  };



  const getFundingInfo = (record, period) => {

    const financialTarget = Number(

      record[period.financialField] || 0

    );



    const currentFund = getFundedAmount(

      record.id,

      period.year

    );



    const gap = Math.max(

      financialTarget - currentFund,

      0

    );



    const percentage =

      financialTarget > 0

        ? Math.min(

            (currentFund / financialTarget) * 100,

            100

          )

        : 0;



    let status = "Not Funded";



    if (percentage >= 100) {

      status = "Fully Funded";

    } else if (percentage > 0) {

      status = "Partially Funded";

    }



    return {

      financialTarget,

      currentFund,

      funded: currentFund,

      gap,

      percentage,

      status,

    };

  };



  const getFundingStatusClass = (percentage) => {

    if (percentage >= 100) {

      return "fully-funded";

    }



    if (percentage > 0) {

      return "partially-funded";

    }



    return "not-funded";

  };



  const openFundingForm = (record) => {

    if (!canFund) {

      setErrorMessage("You are not allowed to add funding.");

      return;

    }

    setEditingContribution(null);
    let defaultPeriod = selectedPeriodData;



    if (!defaultPeriod) {

      defaultPeriod =

        TARGET_PERIODS.find(

          (period) =>

            Number(

              record[period.financialField] || 0

            ) > 0

        ) || TARGET_PERIODS[0];

    }



    setFundingRecord(record);



    setFundingForm({

      targetYear: defaultPeriod.year,

      fundingInstitution:

        currentProfile?.agency || "",

      amount: "",

    });



    setFundingError("");

    setMessage("");

    setShowFundingForm(true);

  };



  const getEditableContributions = (record) =>

    fundingContributions.filter((contribution) =>

      contribution.program_project_id === record.id &&

      (!selectedPeriodData || contribution.target_year === selectedPeriodData.year) &&

      canEditContribution(contribution)

    );

  const openAgencyFundingEditor = (record) => {

    const contributions = getEditableContributions(record);

    if (!contributions.length) {

      setErrorMessage("Your agency has no editable contribution for this project and selected year.");

      return;

    }

    openEditContribution(record, contributions[0]);

  };
  const openEditContribution = (record, contribution) => {

    if (!canEditContribution(contribution)) {

      setErrorMessage("You can only edit your agency's contributions.");

      return;

    }

    setEditingContribution(contribution);



    setFundingRecord(record);

    setFundingForm({

      targetYear: contribution.target_year,

      fundingInstitution: contribution.funding_institution,

      amount: String(contribution.amount),

    });

    setFundingError("");

    setMessage("");

    setShowFundingForm(true);

  };

  const handleDeleteContribution = async (contribution) => {

    if (!canDelete || deletingContributionId) return;

    if (!window.confirm("Delete this funding contribution?")) return;

    setDeletingContributionId(contribution.id);

    setErrorMessage("");

    setMessage("");

    try {

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Please sign in again.");

      const { data: profile, error: profileError } = await supabase

        .from("profiles").select("role").eq("id", user.id).single();

      if (profileError) throw profileError;

      if (profile?.role !== "super_admin") throw new Error("Only Superadmin can delete funding contributions.");

      const { data: deleted, error } = await supabase

        .from("project_funding_contributions")

        .delete().eq("id", contribution.id).select("id").maybeSingle();

      if (error) throw error;

      if (!deleted) throw new Error("Delete denied or the contribution no longer exists.");

      await loadData();

      setShowFundingForm(false);

      setEditingContribution(null);

      setFundingRecord(null);

      setFundingForm(initialFundingForm);
      setMessage("Funding contribution deleted successfully.");

    } catch (error) {

      setFundingError(fundingRequestError(error));

    } finally {

      setDeletingContributionId(null);

    }

  };
  const closeFundingForm = () => {

    if (fundingSaving || deletingContributionId) return;



    setShowFundingForm(false);

    setFundingRecord(null);

    setFundingForm(initialFundingForm);

    setEditingContribution(null);
    setFundingError("");

  };



  const selectedFundingPeriod =

    TARGET_PERIODS.find(

      (period) =>

        period.year === fundingForm.targetYear

    ) || null;



  const currentFundingInfo =

    fundingRecord && selectedFundingPeriod

      ? getFundingInfo(

          fundingRecord,

          selectedFundingPeriod

        )

      : null;



  const isAgencyFundingEdit = currentProfile?.role === "user" && Boolean(editingContribution);
  const ownAgencyCurrentFund = fundingRecord && selectedFundingPeriod
    ? fundingContributions.filter((item) => item.program_project_id === fundingRecord.id &&
        item.target_year === selectedFundingPeriod.year && canEditContribution(item))
      .reduce((total, item) => total + Number(item.amount || 0), 0)
    : 0;

  const handleFundingSubmit = async (event) => {

    event.preventDefault();



    if (!fundingRecord || !selectedFundingPeriod || fundingSaving) return;



    setFundingSaving(true);

    setFundingError("");



    try {

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Your session is unavailable. Please sign in again.");

      const { data: profile, error: profileError } = await supabase

        .from("profiles").select("id, role, agency").eq("id", user.id).single();

      if (profileError) throw profileError;

      setCurrentProfile(profile);

      if (!["super_admin", "admin", "user"].includes(profile?.role)) {

        throw new Error("You are not allowed to add or edit funding.");

      }



      if (!profile.agency?.trim() && !editingContribution) {

        throw new Error("Your account does not have an agency assigned. Please contact the system administrator.");

      }



      const amount = Number(fundingForm.amount);



      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Funding amount must be greater than zero.");

      // Refresh contributions and the target to validate against current data.

      const [projectResult, fundingResult] = await Promise.all([

        supabase.from("programs_projects").select("*").eq("id", fundingRecord.id).single(),

        supabase.from("project_funding_contributions").select("*")

          .eq("program_project_id", fundingRecord.id),

      ]);

      if (projectResult.error) throw projectResult.error;

      if (fundingResult.error) throw fundingResult.error;

      const latestContributions = fundingResult.data || [];

      const existing = editingContribution

        ? latestContributions.find((item) => item.id === editingContribution.id)

        : null;

      if (editingContribution && !canEditContribution(existing, profile)) {

        throw new Error("You can only edit your agency's contributions, or the contribution no longer exists.");

      }



      if (existing && existing.target_year !== selectedFundingPeriod.year) {

        throw new Error("The contribution year changed. Reopen Edit and try again.");

      }



      const financialTarget = Number(projectResult.data[selectedFundingPeriod.financialField] || 0);

      if (financialTarget <= 0) throw new Error(`Please set the ${selectedFundingPeriod.label} Financial Target before adding funding.`);

      // Exclude the contribution being edited so its amount is replaced, not added twice.

      const otherFunding = latestContributions

        .filter((item) => item.target_year === selectedFundingPeriod.year && item.id !== existing?.id)

        .reduce((total, item) => total + Number(item.amount || 0), 0);

      const remaining = Math.max(financialTarget - otherFunding, 0);

      // Permit reducing an existing amount even if older records already exceed the target.

      const reducingExisting = existing && amount <= Number(existing.amount);

      if (amount > remaining && !reducingExisting) {

        throw new Error(`The contribution cannot exceed the available amount of ${formatMoney(remaining)}.`);

      }



      if (existing) {

        const { data: updated, error } = await supabase

          .from("project_funding_contributions")

          .update({ amount })

          .eq("id", existing.id).select("id").maybeSingle();

        if (error) throw error;

        if (!updated) throw new Error("Update denied or the contribution no longer exists.");

      } else {

        const { data: added, error } = await supabase

          .from("project_funding_contributions")

          .insert({

            program_project_id: fundingRecord.id,

            target_year: selectedFundingPeriod.year,

            funding_institution: profile.agency.trim(),

            amount,

            status: "Endorsed for Funding",

            contributed_by: user.id,

          }).select("id").single();

        if (error) throw error;

        if (!added) throw new Error("Funding contribution was not saved.");

      }





      const action = existing ? "updated" : "added";



      setShowFundingForm(false);

      setFundingRecord(null);

      setFundingForm(initialFundingForm);



      setEditingContribution(null);
      await loadData();



      setMessage(`Funding contribution ${action} successfully for ${selectedFundingPeriod.label}.`);
    } catch (error) {

      console.error(error);



      setFundingError(fundingRequestError(error));

    } finally {

      setFundingSaving(false);

    }

  };



  const renderPhysicalTarget = (record) => {

    if (selectedPeriodData) {

      return (

        record[

          selectedPeriodData.physicalField

        ] || "—"

      );

    }



    const available = TARGET_PERIODS.filter(

      (period) => {

        const value =

          record[period.physicalField];



        return (

          value !== null &&

          value !== undefined &&

          String(value).trim() !== ""

        );

      }

    );



    if (available.length === 0) {

      return "—";

    }



    return (

      <div className="programs-all-targets">

        {available.map((period) => (

          <div

            className="programs-target-row"

            key={period.year}

          >

            <strong>{period.label}</strong>

            <span>

              {record[period.physicalField]}

            </span>

          </div>

        ))}

      </div>

    );

  };



  const renderFinancialTarget = (record) => {

    if (selectedPeriodData) {

      return formatMoney(

        record[selectedPeriodData.financialField]

      );

    }



    const available = TARGET_PERIODS.filter(

      (period) =>

        Number(

          record[period.financialField] || 0

        ) > 0

    );



    if (available.length === 0) {

      return "—";

    }



    return (

      <div className="programs-all-financial">

        {available.map((period) => (

          <div

            className="programs-financial-row"

            key={period.year}

          >

            <strong>{period.label}</strong>

            <span>

              {formatMoney(

                record[period.financialField]

              )}

            </span>

          </div>

        ))}

      </div>

    );

  };



  const getAgencyFunding = (record, year) => {
    const totals = new Map();
    fundingContributions.filter((item) => item.program_project_id === record.id && (!year || item.target_year === year))
      .forEach((item) => {
        const agency = item.funding_institution?.trim() || "Unspecified agency";
        const key = agency.toLowerCase();
        const entry = totals.get(key) || { agency, amount: 0 };
        entry.amount += Number(item.amount || 0);
        totals.set(key, entry);
      });
    return Array.from(totals.values());
  };

  const getSourcesOfFund = (record, year) => {
    if (!record) return [];
    const sources = new Map();
    [record.source_of_fund, ...getAgencyFunding(record, year).map((item) => item.agency)]
      .forEach((name) => {
        const agency = name?.trim();
        if (agency && !sources.has(agency.toLowerCase())) sources.set(agency.toLowerCase(), agency);
      });
    return Array.from(sources.values());
  };

  const getDisplayedAgencyFunding = (record, year) => getAgencyFunding(record, year)
    .filter((item) => !selectedAgency || item.agency.toLowerCase() === selectedAgency);
  const getDisplayedFundingInfo = (record, period) => {
    const info = getFundingInfo(record, period);
    if (!selectedAgency) return info;
    const currentFund = getDisplayedAgencyFunding(record, period.year).reduce((total, item) => total + item.amount, 0);
    const percentage = info.financialTarget > 0 ? Math.min(currentFund / info.financialTarget * 100, 100) : 0;
    return { ...info, currentFund, gap: Math.max(info.financialTarget - currentFund, 0), percentage,
      status: percentage >= 100 ? "Fully Funded" : currentFund > 0 ? "Partially Funded" : "Not Funded" };
  };

  const renderAgencyFunding = (record, period) => (
    <div>
      <strong>{formatMoney(getDisplayedFundingInfo(record, period).currentFund)}</strong>
      {getDisplayedAgencyFunding(record, period.year).map(({ agency, amount }) => (
        <small key={agency.toLowerCase()} style={{ display: "block", marginTop: 4 }}>{agency}: {formatMoney(amount)}</small>
      ))}
    </div>
  );

  const renderCurrentFund = (record) => {
    if (selectedPeriodData) return renderAgencyFunding(record, selectedPeriodData);
    return <div className="programs-all-financial">{TARGET_PERIODS.map((period) => (
      <div className="programs-financial-row" key={period.year}>
        <strong>{period.label}</strong>{renderAgencyFunding(record, period)}
      </div>
    ))}</div>;
  };

  const renderFunding = (record) => {

    if (selectedPeriodData) {

      const info = getDisplayedFundingInfo(

        record,

        selectedPeriodData

      );



      if (info.financialTarget <= 0) {

        return (

          <span className="programs-no-funding">

            No financial target

          </span>

        );

      }



      return (

        <FundingProgress info={info} />

      );

    }



    const periodsWithTarget =

      TARGET_PERIODS.filter(

        (period) =>

          Number(

            record[period.financialField] || 0

          ) > 0

      );



    if (periodsWithTarget.length === 0) {

      return (

        <span className="programs-no-funding">

          —

        </span>

      );

    }



    return (

      <div className="programs-all-funding">

        {periodsWithTarget.map((period) => {

          const info = getDisplayedFundingInfo(

            record,

            period

          );



          return (

            <div

              className="programs-year-funding"

              key={period.year}

            >

              <strong>{period.label}</strong>



              <FundingProgress

                info={info}

                compact

              />

            </div>

          );

        })}

      </div>

    );

  };



  function FundingProgress({

    info,

    compact = false,

  }) {

    const statusClass =

      getFundingStatusClass(info.percentage);



    return (

      <div

        className={`programs-funding-progress ${

          compact ? "compact" : ""

        }`}

      >

        <div className="programs-funding-numbers">

          <span>

            Current Fund:{" "}

            <strong>{formatMoney(info.currentFund)}</strong>

          </span>

          <span>

            Gap:{" "}

            <strong>{formatMoney(info.gap)}</strong>

          </span>

        </div>

        <div className="programs-progress-line">

          <div

            className={`programs-progress-fill ${statusClass}`}

            style={{

              width: `${info.percentage}%`,

            }}

          />

        </div>



        <div className="programs-funding-status-row">

          <span

            className={`programs-funding-status ${statusClass}`}

          >

            {info.status}

          </span>



          <strong className="programs-percentage">

            {info.percentage.toFixed(0)}%

          </strong>

        </div>

      </div>

    );

  }



  return (

    <div className="programs-page">

      <header className="module-header programs-header">

        <div>

          <p className="module-eyebrow">

            AMIANAN-CADP L.E.N.S.

          </p>



          <h1>Programs and Projects</h1>



          <p>

            Manage programs, projects, physical

            targets, financial targets, and funding

            progress for registered CADP sites.

          </p>

        </div>



        <button

          type="button"

          className="programs-add-button"

          onClick={openAddForm}

        >

          + Add Program / Project

        </button>

      </header>



      <section className="programs-content">

        <div className="programs-toolbar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "end" }}>

          <label className="programs-site-field">

            <span>CADP Site</span>



            <select

              value={selectedSite}

              onChange={(event) =>

                setSelectedSite(event.target.value)

              }

            >

              <option value="">

                All CADP Sites

              </option>



              {sites.map((site) => (

                <option

                  key={site.id}

                  value={site.id}

                >

                  {site.convergence_name}

                </option>

              ))}

            </select>

          </label>



          <label className="programs-period-field">

            <span>Target Year</span>



            <select

              value={selectedPeriod}

              onChange={(event) =>

                setSelectedPeriod(

                  event.target.value

                )

              }

            >

              <option value="all">

                All Years

              </option>



              {TARGET_PERIODS.map((period) => (

                <option

                  key={period.year}

                  value={period.physicalField}

                >

                  {period.label}

                </option>

              ))}

            </select>

          </label>



          <label className="programs-period-field">
            <span>Agency</span>
            <select value={selectedAgency} onChange={(event) => setSelectedAgency(event.target.value)}>
              <option value="">All Agencies</option>
              {agencyOptions.map((agency) => <option key={agency.value} value={agency.value}>{agency.label}</option>)}
            </select>
          </label>

          <label className="programs-search-field">

            <span>Search</span>



            <input

              type="search"

              value={search}

              onChange={(event) =>

                setSearch(event.target.value)

              }

              placeholder="Search Programs / Projects..."

            />

          </label>



          <p className="programs-result-count">

            {filteredRecords.length}{" "}

            {filteredRecords.length === 1

              ? "record"

              : "records"}

          </p>

        </div>



        {message && (

          <div className="programs-message success">

            {message}

          </div>

        )}



        {errorMessage &&

          !showForm &&

          !showFundingForm && (

            <div className="programs-message error">

              {errorMessage}

            </div>

          )}



        {loading ? (

          <div className="programs-empty-state">

            Loading Programs and Projects...

          </div>

        ) : filteredRecords.length === 0 ? (

          <div className="programs-empty-state">

            <h2>

              No Programs and Projects found

            </h2>



            <p>

              No records match the selected CADP

              site, target year, or search.

            </p>

          </div>

        ) : (

          <div className="programs-table-scroll">

            <table className="programs-table">

              <thead>

                <tr>

                  <th>

                    Proposed Inputs, Activities,

                    Interventions

                  </th>



                  <th>

                    KPI (Key Performance Indicators)

                  </th>



                  <th>Source of Fund</th>



                  <th>Status</th>



                  <th>

                    Physical Target

                    <span className="programs-period-label">

                      {selectedPeriodLabel}

                    </span>

                  </th>



                  <th>

                    Financial Target

                    <span className="programs-period-label">

                      {selectedPeriodLabel}

                    </span>

                  </th>



                  <th>

                    {selectedAgency ? "Agency Contribution" : "Current Fund"}

                    <span className="programs-period-label">

                      {selectedPeriodLabel}

                    </span>

                  </th>



                  <th>

                    {selectedAgency ? "Agency Funding Status" : "Funding Status"}

                    <span className="programs-period-label">

                      {selectedPeriodLabel}

                    </span>

                  </th>



                  <th>Actions</th>

                </tr>

              </thead>



              <tbody>

                {filteredRecords.map((record) => (

                  <tr key={record.id}>

                    <td>

                      {record.intervention}

                    </td>



                    <td>{record.kpi}</td>



                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {(selectedAgency
                          ? [selectedAgencyLabel]
                          : getSourcesOfFund(
                              record,
                              selectedPeriodData?.year
                            )
                        ).map((agency) => (
                          <div
                            key={agency.toLowerCase()}
                            style={{
                              lineHeight: "1.35",
                            }}
                          >
                            {agency}
                          </div>
                        ))}
                      </div>
                    </td>



                    <td>

                      <span

                        className={`programs-status ${String(

                          record.status || ""

                        )

                          .toLowerCase()

                          .replace(/\s+/g, "-")}`}

                      >

                        {record.status}

                      </span>

                    </td>



                    <td className="programs-target">

                      {renderPhysicalTarget(record)}

                    </td>



                    <td className="programs-financial">

                      {renderFinancialTarget(record)}

                    </td>



                    <td className="programs-financial programs-current-fund">

                      {renderCurrentFund(record)}

                    </td>



                    <td className="programs-funding-cell">

                      {renderFunding(record)}

                    </td>



                    <td>

                      <div className="programs-actions">

                        {canFund && (

                          <button type="button" className="programs-fund" onClick={() => openFundingForm(record)}>

                            Fund

                          </button>

                        )}

                        {canEdit(record) && (
                          <button type="button" className="programs-edit" onClick={() => openEditForm(record)}>
                            Edit
                          </button>
                        )}
                        {canDelete && (
                        <button

                          type="button"

                          className="programs-delete"

                          onClick={() =>

                            handleDelete(record)

                          }

                        >

                          Delete

                        </button>

                        )}
                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>



      {showForm && (

        <div

          className="programs-modal-backdrop"

          onMouseDown={(event) => {

            if (

              event.target === event.currentTarget

            ) {

              closeForm();

            }

          }}

        >

          <form

            className="programs-modal programs-main-modal"

            onSubmit={handleSubmit}

          >

            <div className="programs-modal-header">

              <div>

                <p className="module-eyebrow">

                  AMIANAN-CADP L.E.N.S.

                </p>



                <h2>

                  {editingId

                    ? "Edit Program / Project"

                    : "Add Program / Project"}

                </h2>

              </div>



              <button

                type="button"

                className="programs-modal-close"

                onClick={closeForm}

                disabled={saving}

              >

                ×

              </button>

            </div>



            <div className="programs-form-grid">

              <label className="programs-full">

                <span>CADP Site *</span>



                <select

                  value={form.cadpSiteId}

                  onChange={(event) =>

                    updateForm(

                      "cadpSiteId",

                      event.target.value

                    )

                  }

                  required

                >

                  <option value="">

                    Select CADP Site

                  </option>



                  {sites.map((site) => (

                    <option

                      key={site.id}

                      value={site.id}

                    >

                      {site.convergence_name} —{" "}

                      {site.municipality_city},{" "}

                      {site.province}

                    </option>

                  ))}

                </select>

              </label>



              <label className="programs-full">

                <span>

                  Proposed Inputs, Activities,

                  Interventions *

                </span>



                <textarea

                  value={form.intervention}

                  onChange={(event) =>

                    updateForm(

                      "intervention",

                      event.target.value

                    )

                  }

                  required

                />

              </label>



              <label className="programs-full">

                <span>

                  KPI (Key Performance Indicators) *

                </span>



                <textarea

                  value={form.kpi}

                  onChange={(event) =>

                    updateForm(

                      "kpi",

                      event.target.value

                    )

                  }

                  required

                />

              </label>



              <label>

                <span>Source of Fund *</span>



                <input

                  type="text"

                  value={

                    editingId

                      ? getSourcesOfFund(records.find((record) => record.id === editingId)).join(", ") || form.sourceOfFund

                      : currentProfile?.agency || ""

                  }

                  readOnly

                  required

                />

                <small className="programs-auto-field-note">

                  {editingId ? "Agencies associated with this project's funding." : "Automatically based on the account agency."}

                </small>

              </label>



              <label>

                <span>Status *</span>



                <select

                  value={form.status}

                  onChange={(event) =>

                    updateForm(

                      "status",

                      event.target.value

                    )

                  }

                  required

                >

                  {STATUS_OPTIONS.map((status) => (

                    <option

                      key={status}

                      value={status}

                    >

                      {status}

                    </option>

                  ))}

                </select>

              </label>



              <div className="programs-full programs-target-section">

                <div className="programs-target-title">

                  Physical & Financial Targets

                </div>



                <p className="programs-target-help">

                  Set the physical output and required financial target for each year.

                </p>



                <div className="programs-year-targets">

                  {TARGET_PERIODS.map((period) => (

                    <div

                      className="programs-year-target-card"

                      key={period.year}

                    >

                      <div className="programs-year-heading">

                        {period.label}

                      </div>



                      <label>

                        <span>

                          Physical Target

                        </span>



                        <input

                          type="text"

                          value={

                            form[

                              period.physicalFormField

                            ]

                          }

                          onChange={(event) =>

                            updateForm(

                              period.physicalFormField,

                              event.target.value

                            )

                          }

                        />

                      </label>



                      <label>

                        <span>

                          Financial Target

                        </span>



                        <div className="programs-money-input">

                          <span>₱</span>



                          <input

                            type="number"

                            min="0"

                            step="0.01"

                            value={

                              form[

                                period.financialFormField

                              ]

                            }

                            onChange={(event) =>

                              updateForm(

                                period.financialFormField,

                                event.target.value

                              )

                            }

                            placeholder="0.00"

                          />

                        </div>

                      </label>

                    </div>

                  ))}

                </div>

              </div>



              <label className="programs-full">

                <span>Remarks</span>



                <textarea

                  value={form.remarks}

                  onChange={(event) =>

                    updateForm(

                      "remarks",

                      event.target.value

                    )

                  }

                />

              </label>

            </div>



            {errorMessage && (

              <div className="programs-modal-message">

                <div className="programs-message error">

                  {errorMessage}

                </div>

              </div>

            )}



            <div className="programs-modal-actions">

              <button

                type="button"

                className="programs-cancel"

                onClick={closeForm}

                disabled={saving}

              >

                Cancel

              </button>



              <button

                type="submit"

                className="programs-save"

                disabled={saving}

              >

                {saving

                  ? "Saving..."

                  : editingId

                    ? "Save Changes"

                    : "Add Program / Project"}

              </button>

            </div>

          </form>

        </div>

      )}



      {showFundingForm && fundingRecord && (

        <div

          className="programs-modal-backdrop"

          onMouseDown={(event) => {

            if (

              event.target === event.currentTarget

            ) {

              closeFundingForm();

            }

          }}

        >

          <form

            className="programs-modal programs-funding-modal"

            onSubmit={handleFundingSubmit}

          >

            <div className="programs-modal-header">

              <div>

                <p className="module-eyebrow">

                  FUNDING ACTION

                </p>



                <h2>

                  {editingContribution ? "Edit Funding Contribution" : "Add Funding Contribution"}

                </h2>

              </div>



              <button

                type="button"

                className="programs-modal-close"

                onClick={closeFundingForm}

                disabled={fundingSaving || Boolean(deletingContributionId)}

              >

                ×

              </button>

            </div>



            <div className="programs-funding-body">

              <div className="programs-funding-project">

                <span>Program / Project</span>



                <strong>

                  {fundingRecord.intervention}

                </strong>

              </div>



              {editingContribution && (

                <label className="programs-funding-field">

                  <span>{currentProfile?.role === "user" ? "Your Agency's Contribution" : "Contribution to Edit"}</span>

                  <select value={editingContribution.id} disabled={fundingSaving || Boolean(deletingContributionId)}

                    onChange={(event) => {

                      const contribution = getEditableContributions(fundingRecord).find((item) => item.id === event.target.value);

                      if (contribution) openEditContribution(fundingRecord, contribution);

                    }}>

                    {getEditableContributions(fundingRecord).map((contribution) => (

                      <option key={contribution.id} value={contribution.id}>

                        {contribution.target_year} — {contribution.funding_institution} — {formatMoney(contribution.amount)}

                        {contribution.created_at ? ` — ${new Date(contribution.created_at).toLocaleString("en-PH")}` : ""}

                      </option>

                    ))}

                  </select>

                  <small className="programs-auto-field-note">Select the contribution to update, then change its amount.</small>

                </label>

              )}
              <label className="programs-funding-field">

                <span>Target Year *</span>



                <select

                  value={fundingForm.targetYear}

                  disabled={Boolean(editingContribution) || fundingSaving || Boolean(deletingContributionId)}
                  onChange={(event) =>

                    setFundingForm(

                      (previous) => ({

                        ...previous,

                        targetYear:

                          event.target.value,

                      })

                    )

                  }

                  required

                >

                  {TARGET_PERIODS.map((period) => (

                    <option

                      key={period.year}

                      value={period.year}

                    >

                      {period.label}

                    </option>

                  ))}

                </select>

              </label>



              {currentFundingInfo && (

                <div className="programs-funding-summary">

                  <div>

                    <span>

                      Financial Target

                    </span>



                    <strong>

                      {formatMoney(

                        currentFundingInfo.financialTarget

                      )}

                    </strong>

                  </div>



                  <div>

                    <span>{isAgencyFundingEdit ? "Your Agency’s Current Fund" : "Project Current Fund"}</span>



                    <strong>

                      {formatMoney(

                        isAgencyFundingEdit ? ownAgencyCurrentFund : currentFundingInfo.currentFund

                      )}

                    </strong>

                  </div>











                  <div>

                    <span>Project Funding Gap</span>



                    <strong>

                      {formatMoney(

                        currentFundingInfo.gap

                      )}

                    </strong>

                  </div>



                  <div>

                    <span>Project Progress</span>



                    <strong>

                      {currentFundingInfo.percentage.toFixed(

                        0

                      )}

                      %

                    </strong>

                  </div>

                </div>

              )}



              {!isAgencyFundingEdit && currentFundingInfo &&

                currentFundingInfo.financialTarget >

                  0 && (

                  <FundingProgress

                    info={currentFundingInfo}

                  />

                )}



              <label className="programs-funding-field">

                <span>

                  Source of Fund *

                </span>



                <input

                  type="text"

                  value={editingContribution ? fundingForm.fundingInstitution : currentProfile?.agency || ""}

                  readOnly

                  required

                />

                <small className="programs-auto-field-note">

                  {editingContribution ? "The original funding agency is preserved." : "Automatically based on the logged-in account agency."}

                </small>

              </label>



              <label className="programs-funding-field">

                <span>

                  Contribution Amount *

                </span>



                <div className="programs-money-input">

                  <span>₱</span>



                  <input

                    type="number"

                    min="0.01"

                    step="0.01"

                    value={fundingForm.amount}

                    onChange={(event) =>

                      setFundingForm(

                        (previous) => ({

                          ...previous,

                          amount:

                            event.target.value,

                        })

                      )

                    }

                    placeholder="0.00"

                    required

                  />

                </div>

              </label>



              {fundingError && (

                <div className="programs-message error">

                  {fundingError}

                </div>

              )}

            </div>



            <div className="programs-modal-actions">

              {canDelete && editingContribution && (

                <button type="button" className="programs-delete" disabled={fundingSaving || Boolean(deletingContributionId)}

                  onClick={() => handleDeleteContribution(editingContribution)}>

                  {deletingContributionId ? "Deleting..." : "Delete Contribution"}

                </button>

              )}
              <button

                type="button"

                className="programs-cancel"

                onClick={closeFundingForm}

                disabled={fundingSaving || Boolean(deletingContributionId)}

              >

                Cancel

              </button>



              <button

                type="submit"

                className="programs-save"

                disabled={

                  fundingSaving || Boolean(deletingContributionId) ||

                  (!editingContribution && currentFundingInfo &&

                    currentFundingInfo.percentage >= 100)

                }

              >

                {fundingSaving

                  ? "Saving..."

                  : editingContribution

                    ? "Save Changes"

                    : currentFundingInfo && currentFundingInfo.percentage >= 100

                      ? "Fully Funded"

                      : "Add Funding"}

              </button>

            </div>

          </form>

        </div>

      )}

    </div>

  );

}



export default ProgramsProjects;

