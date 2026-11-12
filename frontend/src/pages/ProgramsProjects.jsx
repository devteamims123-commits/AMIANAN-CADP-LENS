import { useCallback, useEffect, useMemo, useRef, useState } from "react";



import { supabase } from "../services/supabase";
import { useProtectedAuth } from "../components/auth/ProtectedRoute";



import "./ProgramsProjects.css";
import ProjectActions from "../components/ProjectActions";
import FundingRequests from "../components/FundingRequests";
import SearchableDropdown from "../components/SearchableDropdown";







const LEGACY_KPI_CATEGORY = "__existing_kpi__";
const getKpiCategory = (record, catalogue) => {
  const categories = Object.keys(catalogue);
  if (categories.includes(record.kpi_category)) return record.kpi_category;
  const matches = categories.filter((category) =>
    catalogue[category].includes(record.kpi)
  );
  // Ambiguous and older free-text KPIs keep their value until explicitly recategorized.
  return matches.length === 1 ? matches[0] : record.kpi ? LEGACY_KPI_CATEGORY : "";
};

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



  kpiCategory: "",
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
  const { profile: authenticatedProfile } = useProtectedAuth();
  const [lguScope, setLguScope] = useState(null);
  const isLGU = authenticatedProfile?.role === "user" &&
    authenticatedProfile?.organization_type?.trim().toLowerCase() === "lgu";
  const isAgency = authenticatedProfile?.role === "user" &&
    authenticatedProfile?.organization_type?.trim().toLowerCase() === "agency";
  const canCreateProject = ["super_admin", "admin"].includes(authenticatedProfile?.role) ||
    ((isLGU || isAgency) && Boolean(authenticatedProfile?.agency_lgu_id));
  const normalize = (value) => String(value ?? "").trim().toLowerCase();
  const isAuthorizedSite = (site, scope = lguScope) =>
    !isLGU || Boolean(scope &&
      normalize(site?.province) === normalize(scope.province) &&
      normalize(site?.municipality_city) === normalize(scope.municipality));
  const isAuthorizedProject = (record) =>
    !isLGU || sites.some((site) =>
      String(site.id) === String(record?.cadp_site_id) && isAuthorizedSite(site));

  const [endorsementProject, setEndorsementProject] = useState(null);
  const closeEndorsement = useCallback(() => setEndorsementProject(null), []);



  const [records, setRecords] = useState([]);



  const [sites, setSites] = useState([]);
  // Viewing and adding projects have different CADP-site scopes.
  // Agency users can choose any site; LGUs can choose only their registered location.
  const selectableSites = useMemo(() => {
    if (!canCreateProject) return [];
    if (!isLGU) return sites;
    if (!lguScope) return [];
    return sites.filter((site) => isAuthorizedSite(site, lguScope));
  }, [sites, lguScope, isLGU, canCreateProject]);
  const [kpiCategories, setKpiCategories] = useState([]);
  const [kpiOptions, setKpiOptions] = useState([]);
  const kpiByCategory = useMemo(() => {
    const catalogue = Object.fromEntries(kpiCategories.map((category) => [category.name, []]));
    kpiOptions.forEach((option) => {
      if (catalogue[option.category_name]) catalogue[option.category_name].push(option.label);
    });
    return catalogue;
  }, [kpiCategories, kpiOptions]);




  const [fundingContributions, setFundingContributions] = useState([]);



  const [currentProfile, setCurrentProfile] = useState(null);







  const [selectedSite, setSelectedSite] = useState("");



  const [selectedAgency, setSelectedAgency] = useState("");
  const [selectedLGU, setSelectedLGU] = useState("");
  const [registeredOrganizations, setRegisteredOrganizations] = useState([]);
  const selectedOrganization = selectedAgency || selectedLGU;
  const [acceptedProjectIds, setAcceptedProjectIds] = useState([]);
  const [ownedProjectIds, setOwnedProjectIds] = useState([]);



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
  const isProjectOwner = (record) => Boolean(record && ownedProjectIds.includes(String(record.id)));
  const canAddProjectFund = (record) => {
    if (!canFund || !record) return false;
    if (isLGU && !isAuthorizedProject(record) && !acceptedProjectIds.includes(String(record.id))) return false;
    if (["super_admin", "admin"].includes(currentProfile?.role)) return true;
    const agency = currentProfile?.agency?.trim().toLowerCase();
    return Boolean(agency && (
      isProjectOwner(record)
      || agency === record.source_of_fund?.trim().toLowerCase()
      || acceptedProjectIds.includes(String(record.id))
    ));
  };


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
    if (!record || !profile || !isAuthorizedProject(record)) return false;
    if (["super_admin", "admin"].includes(profile.role)) return true;
    if (profile.role !== "user") return false;
    // Ownership is verified by the database using the creator's registered organization.
    // Never infer project ownership from source_of_fund or an endorsement.
    return isProjectOwner(record);
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







      // Resolve the registered LGU from its canonical ID, not the free-text organization name.
      let scope = null;
      if (isLGU) {
        if (!authenticatedProfile?.agency_lgu_id) {
          throw new Error("Your account is not linked to a registered LGU.");
        }
        const { data: lgu, error: lguError } = await supabase
          .from("agencies_lgus")
          .select("province, municipality")
          .eq("id", authenticatedProfile.agency_lgu_id)
          .single();
        if (lguError) throw lguError;
        if (!lgu?.province || !lgu?.municipality) {
          throw new Error("Your registered LGU has incomplete province or municipality information.");
        }
        scope = lgu;
      }
      setLguScope(scope);
      if (isAgency) {
        if (!authenticatedProfile?.agency_lgu_id) {
          throw new Error("Your account is not linked to a registered Agency.");
        }
        const { data: agency, error: agencyError } = await supabase
          .from("agencies_lgus")
          .select("name, organization_type")
          .eq("id", authenticatedProfile.agency_lgu_id)
          .single();
        if (agencyError) throw agencyError;
        if (normalize(agency?.organization_type) !== "agency" ||
            normalize(agency?.name) !== normalize(authenticatedProfile?.organization)) {
          throw new Error("Your registered Agency assignment does not match your account.");
        }
      }

      const [sitesResult, recordsResult, fundingResult, profileResult, acceptedResult, categoriesResult, kpisResult, organizationsResult] =
        await Promise.all([



          supabase



            .from("cadp_sites")



            .select(



              "id, convergence_name, province, municipality_city, barangay"



            )



            .order("municipality_city"),







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



            .select("id, role, agency:organization")



            .eq("id", user.id)



            .single(),

          supabase.rpc("cadp_accepted_projects"),
          supabase.from("kpi_categories").select("name, display_order").order("display_order").order("name"),
          supabase.from("kpi_indicators").select("category_name, label, display_order").order("display_order").order("label"),



          supabase.from("agencies_lgus").select("name, organization_type"),
        ]);







      if (sitesResult.error) throw sitesResult.error;



      if (recordsResult.error) throw recordsResult.error;



      if (fundingResult.error) throw fundingResult.error;



      if (profileResult.error) throw profileResult.error;
      if (acceptedResult.error) throw acceptedResult.error;
      if (organizationsResult.error) throw organizationsResult.error;
      setRegisteredOrganizations(organizationsResult.data || []);
      if (categoriesResult.error || kpisResult.error) {
        throw new Error("Unable to load the KPI catalogue. Run database/kpi_catalogue.sql and try again.");
      }
      if (!(categoriesResult.data || []).length || !(kpisResult.data || []).length) {
        throw new Error("The KPI catalogue is empty. Run database/kpi_catalogue.sql to populate it.");
      }
      setKpiCategories(categoriesResult.data);
      setKpiOptions(kpisResult.data);
      const acceptedData = acceptedResult.data || {};
      // Accepted project IDs are scoped below, after resolving allowed CADP sites.







      // The direct Supabase queries are RLS-filtered. Do not reintroduce
      // otherwise-hidden projects from the accepted-projects RPC.
      const registeredSites = sitesResult.data || [];
      // Supabase RLS determines which projects can be read, including accepted
      // endorsements outside an LGU's registered municipality.
      const allowedProjects = recordsResult.data || [];
      const allowedProjectIds = new Set(allowedProjects.map((record) => String(record.id)));
      setAcceptedProjectIds((acceptedData.projects || [])
        .filter((item) => allowedProjectIds.has(String(item.id)))
        .map((item) => String(item.id)));

      setSites(registeredSites);
      setSelectedSite((current) =>
        current && !registeredSites.some((site) => normalize(site.municipality_city) === current)
          ? "" : current);
      // Resolve ownership with the SECURITY DEFINER RPC. The profiles table only
      // exposes the signed-in user's profile, so client-side creator joins are unsafe.
      // Failed checks default to no ownership; RLS remains the final authority.
      const ownershipChecks = await Promise.allSettled(allowedProjects.map(async (record) => {
        const { data, error } = await supabase.rpc("cadp_is_project_owner", {
          target_project_id: record.id,
        });
        if (error) throw error;
        return data === true ? String(record.id) : null;
      }));
      const ownershipFailures = ownershipChecks.filter((result) => result.status === "rejected");
      if (ownershipFailures.length) {
        console.warn("Some project ownership checks failed:", ownershipFailures[0].reason);
      }
      setOwnedProjectIds(ownershipChecks
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value));
      setRecords(allowedProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setFundingContributions((fundingResult.data || [])
        .filter((item) => allowedProjectIds.has(String(item.program_project_id))));



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







  // Populate Agency and LGU filters from registered organizations, regardless
  // of whether they currently have a visible project or funding contribution.
  // Older project funding sources absent from the registry remain filterable.
  const organizationOptions = useMemo(() => {
    const options = { agency: new Map(), lgu: new Map() };
    registeredOrganizations.forEach(({ name, organization_type }) => {
      const kind = normalize(organization_type);
      const key = normalize(name);
      if (options[kind] && key) {
        options[kind].set(key, { value: key, label: name.trim() });
      }
    });

    const includeUnregisteredSource = (name) => {
      const key = normalize(name);
      if (!key || options.agency.has(key) || options.lgu.has(key)) return;
      // Legacy source_of_fund values do not record organization type.
      // Show them under Agency as an uncategorized funding-source fallback.
      options.agency.set(key, { value: key, label: String(name).trim() });
    };
    records.forEach((record) => includeUnregisteredSource(record.source_of_fund));
    fundingContributions.forEach((item) => includeUnregisteredSource(item.funding_institution));
    if (acceptedProjectIds.length) includeUnregisteredSource(currentProfile?.agency);

    return Object.fromEntries(Object.entries(options).map(([kind, items]) => [
      kind, Array.from(items.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ]));
  }, [records, fundingContributions, acceptedProjectIds, currentProfile?.agency, registeredOrganizations]);
  const agencyOptions = organizationOptions.agency;
  const lguOptions = isLGU
  ? organizationOptions.lgu.filter(
      (lgu) =>
        lgu.value ===
        normalize(authenticatedProfile?.organization)
    )
  : organizationOptions.lgu;
  const selectedOrganizationLabel = [...agencyOptions, ...lguOptions]
    .find((item) => item.value === selectedOrganization)?.label || "";
  const siteMunicipalities = useMemo(() => {



    const municipalities = new Map();



    sites.filter((site) => records.some((record) => String(record.cadp_site_id) === String(site.id))).forEach((site) => {



      const label = site.municipality_city?.trim();



      if (label && !municipalities.has(label.toLowerCase())) municipalities.set(label.toLowerCase(), label);



    });



    return Array.from(municipalities, ([value, label]) => ({ value, label }))



      .sort((a, b) => a.label.localeCompare(b.label));



  }, [sites, records]);



  const getDefaultSiteId = () => {
    const selected = selectableSites.find((site) => normalize(site.municipality_city) === selectedSite);
    return (selected || selectableSites[0])?.id || "";
  };

  const filteredRecords = useMemo(() => {



    const query = search.trim().toLowerCase();







    return records.filter((record) => {
      const matchesSite =



        !selectedSite || sites.some((site) => site.id === record.cadp_site_id &&



          site.municipality_city?.trim().toLowerCase() === selectedSite);







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







      const matchesAgency = !selectedOrganization
        || record.source_of_fund?.trim().toLowerCase() === selectedOrganization
        || (selectedOrganization === currentProfile?.agency?.trim().toLowerCase()
          && acceptedProjectIds.includes(String(record.id)))
        || fundingContributions.some((item) =>
          String(item.program_project_id) === String(record.id)
          && item.funding_institution?.trim().toLowerCase() === selectedOrganization
          && (!selectedPeriodData || item.target_year === selectedPeriodData.year)
        );

      return matchesSite && matchesPeriod && matchesSearch && matchesAgency;



    });



  }, [



    records,



    sites,

    fundingContributions,



    selectedAgency,
    selectedLGU,
    acceptedProjectIds,
    currentProfile?.agency,



    selectedSite,



    selectedPeriod,



    selectedPeriodData,



    search,



  ]);







  const updateForm = (field, value) => {



    setForm((previous) => ({



      ...previous,



      [field]: value,
      ...(field === "kpiCategory" ? { kpi: "" } : {}),



    }));







    setErrorMessage("");



  };







  const openAddForm = () => {
    if (!canCreateProject) {
      setErrorMessage("Your account must be assigned to a registered Agency or LGU to add projects.");
      return;
    }
    if (!selectableSites.length) {
      setErrorMessage(isLGU
        ? "No CADP sites are registered within your LGU's municipality."
        : "No registered CADP sites are available.");
      return;
    }



    setEditingId(null);



    setForm({



      ...initialForm,



      cadpSiteId: getDefaultSiteId(),

      sourceOfFund: "",



    });



    setMessage("");



    setErrorMessage("");



    setShowForm(true);



  };







  const openEditForm = (record) => {
    if (!isAuthorizedProject(record)) {
      setErrorMessage("You cannot edit a project outside your registered LGU.");
      return;
    }



    if (!canEdit(record)) {



      setErrorMessage("You can only edit your agency's records.");



      return;



    }

    setEditingId(record.id);







    setForm({



      cadpSiteId: record.cadp_site_id || "",



      intervention: record.intervention || "",



      kpiCategory: getKpiCategory(record, kpiByCategory),
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



        .select("id, role, agency:organization")



        .eq("id", user.id)



        .single();



      if (profileError) throw profileError;
      if (!canCreateProject) {
        throw new Error("Your account is not assigned to an authorized Agency or LGU.");
      }

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



        !form.kpiCategory ||
        !form.kpi.trim() ||



        !form.status



      ) {



        throw new Error(



          "Please complete all required fields."



        );



      }







      // Validate against the form's authorized site choices before saving.
      if (!selectableSites.some((site) => String(site.id) === String(form.cadpSiteId))) {
        throw new Error("The selected CADP site is not authorized for your account.");
      }
      // Recheck the selected CADP site against the authenticated LGU before saving.
      if (isLGU) {
        const { data: selectedSiteRecord, error: siteError } = await supabase
          .from("cadp_sites")
          .select("id, province, municipality_city")
          .eq("id", form.cadpSiteId)
          .maybeSingle();
        if (siteError) throw siteError;
        if (!selectedSiteRecord || !isAuthorizedSite(selectedSiteRecord)) {
          throw new Error("You may only save projects for CADP sites in your registered LGU.");
        }
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
        kpi_category: form.kpiCategory === LEGACY_KPI_CATEGORY ? null : form.kpiCategory,



        source_of_fund: editingId



          ? editingRecord.source_of_fund



          : form.sourceOfFund.trim() || null,



        status: editingId ? form.status : "Proposed",







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
    if (!canAddProjectFund(record)) {



      setErrorMessage("Your agency must accept the funding request before adding funds to this project.");



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
    if (!editingContribution && !canAddProjectFund(fundingRecord)) {
      setFundingError("You are not authorized to fund this project. Accept the endorsement first.");
      return;
    }







    setFundingSaving(true);



    setFundingError("");







    try {



      const { data: { user }, error: userError } = await supabase.auth.getUser();



      if (userError || !user) throw new Error("Your session is unavailable. Please sign in again.");



      const { data: profile, error: profileError } = await supabase



        .from("profiles").select("id, role, agency:organization").eq("id", user.id).single();



      if (profileError) throw profileError;



      setCurrentProfile(profile);



      if (!["super_admin", "admin", "user"].includes(profile?.role)) {



        throw new Error("You are not allowed to add or edit funding.");



      }







      if (!profile.agency?.trim() && !editingContribution) {



        throw new Error("Your account does not have an agency assigned. Please contact the system administrator.");



      }







      if (!editingContribution) {
        const { data: allowed, error: permissionError } = await supabase.rpc("cadp_can_add_project_funding", {
          p_project_id: String(fundingRecord.id),
        });
        if (permissionError) throw permissionError;
        if (allowed !== true) throw new Error("Your agency must accept the funding request before adding funds to this project.");
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

    .filter((item) => !selectedOrganization || item.agency.toLowerCase() === selectedOrganization);
  const getDisplayedFundingInfo = (record, period) => {

    const info = getFundingInfo(record, period);

    if (!selectedOrganization) return info;
    const currentFund = getDisplayedAgencyFunding(record, period.year).reduce((total, item) => total + item.amount, 0);

    const percentage = info.financialTarget > 0 ? Math.min(currentFund / info.financialTarget * 100, 100) : 0;

    return { ...info, currentFund, gap: Math.max(info.financialTarget - currentFund, 0), percentage,

      status: percentage >= 100 ? "Fully Funded" : currentFund > 0 ? "Partially Funded" : "Not Funded" };

  };



  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const reportDropdownRef = useRef(null);

  useEffect(() => {
    if (!showReportOptions) return;
    const closeOnOutsideClick = (event) => {
      if (!reportDropdownRef.current?.contains(event.target)) {
        setShowReportOptions(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowReportOptions(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showReportOptions]);

  const handleExportPdf = async () => {
    if (loading || exportingPdf || exportingExcel || !filteredRecords.length) return;
    setExportingPdf(true);
    setShowReportOptions(false);
    setErrorMessage("");
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default || autoTableModule.autoTable;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const right = pageWidth - margin;
      const periods = selectedPeriodData ? [selectedPeriodData] : TARGET_PERIODS;
      const siteById = new Map(sites.map((site) => [String(site.id), site]));
      const stamp = new Date();
      const dateStamp = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`;
      const safeText = (value) => String(value ?? "").replace(/[\u2013\u2014]/g, "-").replace(/\u20b1/g, "PHP ");
      const amount = (value) => value == null || value === "" ? "-" : `PHP ${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const newPageIfNeeded = (height, y) => {
        if (y + height > pageHeight - 18) {
          doc.addPage();
          return 20;
        }
        return y;
      };
      const writeField = (label, value, y) => {
        const lines = doc.splitTextToSize(`${label}: ${safeText(value || "-")}`, pageWidth - margin * 2);
        y = newPageIfNeeded(lines.length * 4.2 + 2, y);
        doc.text(lines, margin, y);
        return y + lines.length * 4.2 + 2;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 95, 57);
      doc.text("CADP PROGRAMS AND PROJECTS REPORT", margin, 17);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 95);
      doc.setFontSize(9);
      doc.text(`Generated: ${dateStamp}   |   Target year: ${selectedPeriodData?.label || "All Years"}   |   Projects: ${filteredRecords.length}`, margin, 24);
      const filters = [selectedSite && `Site: ${selectedSite}`, selectedOrganization && `Organization: ${selectedOrganizationLabel || selectedOrganization}`, search.trim() && `Search: ${search.trim()}`].filter(Boolean);
      let y = 30;
      if (filters.length) y = writeField("Filters", filters.join(" | "), y);

      filteredRecords.forEach((record, index) => {
        const site = siteById.get(String(record.cadp_site_id));
        y = newPageIfNeeded(48, y);
        doc.setDrawColor(210, 220, 215);
        doc.line(margin, y - 3, right, y - 3);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 95, 57);
        doc.setFontSize(11);
        const heading = doc.splitTextToSize(`${index + 1}. ${safeText(record.intervention || "Program / Project")}`, pageWidth - margin * 2);
        doc.text(heading, margin, y + 2);
        y += heading.length * 5 + 4;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(45, 55, 60);
        doc.setFontSize(9);
        y = writeField("Location", [site?.barangay, site?.municipality_city, site?.province].filter(Boolean).join(", "), y);
        y = writeField("CADP Site", site?.convergence_name, y);
        y = writeField("KPI Category", record.kpi_category, y);
        y = writeField("KPI", record.kpi, y);
        y = writeField("Source of Fund", selectedOrganization ? (selectedOrganizationLabel || selectedOrganization) : getSourcesOfFund(record, selectedPeriodData?.year).join(", "), y);
        y = writeField("Project Status", record.status, y);

        const body = periods.map((period) => {
          const info = getDisplayedFundingInfo(record, period);
          const contributions = getDisplayedAgencyFunding(record, period.year);
          return [
            period.label.replace("–", "-"),
            safeText(record[period.physicalField] || "-"),
            amount(record[period.financialField]),
            amount(info.currentFund),
            amount(info.gap),
            `${info.percentage.toFixed(2)}%`,
            Number(record[period.financialField] || 0) > 0 ? info.status : "No target",
            safeText(contributions.map((item) => `${item.agency}: ${amount(item.amount)}`).join("; ") || "-"),
          ];
        });
        autoTable(doc, {
          startY: y + 1,
          head: [["Year", "Physical Target", "Financial Target", "Current Fund", "Funding Gap", "Funded", "Funding Status", "Contributions"]],
          body,
          margin: { left: margin, right: margin, top: 18, bottom: 18 },
          theme: "grid",
          styles: { font: "helvetica", fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
          headStyles: { fillColor: [33, 115, 70], textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 21 }, 1: { cellWidth: 34 }, 2: { cellWidth: 32 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 18 }, 6: { cellWidth: 28 } },
        });
        y = doc.lastAutoTable.finalY + 7;
        doc.setFontSize(9);
        y = writeField("Remarks", record.remarks, y);
        y += 5;
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(`CADP Programs and Projects | ${dateStamp}`, margin, pageHeight - 9);
        doc.text(`Page ${page} of ${totalPages}`, right, pageHeight - 9, { align: "right" });
      }
      doc.save(`CADP_Programs_Projects_${dateStamp}.pdf`);
    } catch (error) {
      console.error("Unable to generate PDF report:", error);
      setErrorMessage(error.message || "Unable to generate the PDF report.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (loading || exportingExcel || filteredRecords.length === 0) return;
    setExportingExcel(true);
    setShowReportOptions(false);
    setErrorMessage("");

    try {
      // Use ExcelJS's browser bundle; the previous xlsx dependency is not required.
      const excelModule = await import("exceljs/dist/exceljs.min.js");
      const ExcelJS = excelModule.default || excelModule;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Programs and Projects", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      const columns = [
        ["Province", 22],
        ["City / Municipality", 26],
        ["Barangay", 24],
        ["CADP Site / Convergence Name", 34],
        ["Proposed Inputs, Activities, Interventions", 55],
        ["KPI Category", 32],
        ["KPI (Key Performance Indicators)", 55],
        ["Source of Fund", 35],
        ["Project Status", 19],
        ["Target Year", 18],
        ["Physical Target", 35],
        ["Financial Target (PHP)", 23],
        ["Current Fund (PHP)", 23],
        ["Funding Gap (PHP)", 23],
        ["Funding Percentage", 21],
        ["Funding Status", 22],
        ["Funding Contributions", 55],
        ["Remarks", 50],
      ];
      worksheet.columns = columns.map(([header, width]) => ({ header, key: header, width }));
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FF217346" },
      };
      worksheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
      worksheet.getRow(1).height = 32;

      const periods = selectedPeriodData ? [selectedPeriodData] : TARGET_PERIODS;
      const siteById = new Map(sites.map((site) => [String(site.id), site]));

      filteredRecords.forEach((record) => {
        const site = siteById.get(String(record.cadp_site_id));
        const sourceNames = selectedOrganization
          ? [selectedOrganizationLabel || selectedOrganization]
          : getSourcesOfFund(record, selectedPeriodData?.year);

        periods.forEach((period) => {
          const funding = getDisplayedFundingInfo(record, period);
          const contributions = getDisplayedAgencyFunding(record, period.year);
          const physical = record[period.physicalField];
          const financial = record[period.financialField];
          worksheet.addRow({
            "Province": site?.province || "",
            "City / Municipality": site?.municipality_city || "",
            "Barangay": site?.barangay || "",
            "CADP Site / Convergence Name": site?.convergence_name || "",
            "Proposed Inputs, Activities, Interventions": record.intervention || "",
            "KPI Category": record.kpi_category || "",
            "KPI (Key Performance Indicators)": record.kpi || "",
            "Source of Fund": sourceNames.join(", "),
            "Project Status": record.status || "",
            "Target Year": period.label,
            "Physical Target": physical == null ? "" : String(physical),
            "Financial Target (PHP)": financial == null || financial === "" ? null : Number(financial),
            "Current Fund (PHP)": funding.currentFund,
            "Funding Gap (PHP)": funding.gap,
            "Funding Percentage": Number(funding.percentage.toFixed(2)) / 100,
            "Funding Status": Number(financial || 0) > 0 ? funding.status : "No financial target",
            "Funding Contributions": contributions.map((item) => `${item.agency}: PHP ${item.amount.toFixed(2)}`).join("; "),
            "Remarks": record.remarks || "",
          });
        });
      });

      for (let index = 2; index <= worksheet.rowCount; index += 1) {
        const row = worksheet.getRow(index);
        [12, 13, 14].forEach((column) => {
          row.getCell(column).numFmt = "#,##0.00";
        });
        row.getCell(15).numFmt = "0.00%";
        row.alignment = { vertical: "top", wrapText: true };
      }
      worksheet.autoFilter = { from: "A1", to: "R1" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date();
      const dateStamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      link.href = url;
      link.download = `CADP_Programs_Projects_${dateStamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Unable to export Programs and Projects:", error);
      setErrorMessage(error.message || "Unable to generate the Excel file.");
    } finally {
      setExportingExcel(false);
    }
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
        <div className="cadp-header-actions">
          <FundingRequests profile={currentProfile} endorsementProject={endorsementProject} onCloseEndorsement={closeEndorsement} onAccepted={async () => {
            setSelectedSite(""); setSelectedPeriod("all"); setSelectedAgency(""); setSelectedLGU(""); setSearch("");
            await loadData();
          }} />







        <button



          type="button"



          className="programs-add-button"
          disabled={loading || !canCreateProject || !selectableSites.length}



          onClick={openAddForm}



        >



          + Add Program / Project



        </button>
        </div>



      </header>







      <section className="programs-content">



        <style>{`
          .programs-report-toolbar > label { min-width: 0; }
          .programs-report-toolbar > label select,
          .programs-report-toolbar > label input { width: 100%; min-width: 0; }
          @media (max-width: 1150px) {
            .programs-report-toolbar { flex-wrap: wrap !important; }
            .programs-report-toolbar > label { flex: 1 1 190px !important; }
          }
        `}</style>
        <div className="programs-toolbar programs-report-toolbar" style={{ display: "flex", flexWrap: "nowrap", alignItems: "end", gap: 16, width: "100%" }}>



          <label className="programs-site-field" style={{ flex: "1 1 0", minWidth: 0 }}>



            <span>CADP Site</span>







            <select



              value={selectedSite}



              onChange={(event) =>



                setSelectedSite(event.target.value)



              }



            >



              <option value="">



                All Cities / Municipalities



              </option>







              {siteMunicipalities.map((municipality) => (



                <option key={municipality.value} value={municipality.value}>



                  {municipality.label}



                </option>



              ))}



            </select>



          </label>







          <label className="programs-period-field" style={{ flex: "1 1 0", minWidth: 0 }}>



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







          <label className="programs-period-field" style={{ flex: "1 1 0", minWidth: 0 }}>

            <span>Agency</span>

            <select value={selectedAgency} onChange={(event) => { setSelectedAgency(event.target.value); setSelectedLGU(""); }}>
              <option value="">All Agencies</option>

              {agencyOptions.map((agency) => <option key={agency.value} value={agency.value}>{agency.label}</option>)}

            </select>
          </label>
          <label className="programs-period-field" style={{ flex: "1 1 0", minWidth: 0 }}>
            <span>LGU</span>
            <select value={selectedLGU} onChange={(event) => { setSelectedLGU(event.target.value); setSelectedAgency(""); }}>
              <option value="">All LGUs</option>
              {lguOptions.map((lgu) => <option key={lgu.value} value={lgu.value}>{lgu.label}</option>)}
            </select>

          </label>



          <label className="programs-search-field" style={{ flex: "1 1 0", minWidth: 0 }}>



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







          <p className="programs-result-count" style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>



            {filteredRecords.length}{" "}



            {filteredRecords.length === 1



              ? "record"



              : "records"}



          </p>
          <div ref={reportDropdownRef} style={{ position: "relative", marginLeft: "auto", flex: "0 0 auto", alignSelf: "end" }}>
            <button
              type="button"
              className="programs-add-button"
              onClick={() => setShowReportOptions((open) => !open)}
              disabled={loading || exportingExcel || exportingPdf || filteredRecords.length === 0}
              aria-expanded={showReportOptions}
              aria-haspopup="true"
              style={{ background: "#217346", opacity: loading || exportingExcel || exportingPdf || !filteredRecords.length ? 0.55 : 1 }}
            >
              {exportingExcel ? "Generating Excel..." : exportingPdf ? "Generating PDF..." : "Generate Report ▾"}
            </button>
            {showReportOptions && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100, width: "100%", minWidth: 0, background: "#fff", border: "1px solid #888", borderRadius: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.12)", padding: 0, overflow: "hidden" }}>
                <button type="button" onClick={() => { setShowReportOptions(false); handleExportExcel(); }} onMouseEnter={(event) => { event.currentTarget.style.background = "#1e66cf"; event.currentTarget.style.color = "#fff"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "#fff"; event.currentTarget.style.color = "#172b25"; }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", border: 0, borderRadius: 0, background: "#fff", cursor: "pointer", color: "#172b25", fontSize: 14, fontWeight: 400, lineHeight: "20px" }}>Excel (.xlsx)</button>
                <button type="button" onClick={() => { setShowReportOptions(false); handleExportPdf(); }} onMouseEnter={(event) => { event.currentTarget.style.background = "#1e66cf"; event.currentTarget.style.color = "#fff"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "#fff"; event.currentTarget.style.color = "#172b25"; }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", border: 0, borderRadius: 0, background: "#fff", cursor: "pointer", color: "#172b25", fontSize: 14, fontWeight: 400, lineHeight: "20px" }}>PDF (.pdf)</button>
              </div>
            )}
          </div>




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



                    {selectedOrganization ? "Organization Contribution" : "Current Fund"}
                    <span className="programs-period-label">



                      {selectedPeriodLabel}



                    </span>



                  </th>







                  <th>



                    {selectedOrganization ? "Organization Funding Status" : "Funding Status"}
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

                        {(selectedOrganization
                          ? [selectedOrganizationLabel]
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
                      <ProjectActions
                        disabled={loading} canFund={canAddProjectFund(record)} canAddFund={canAddProjectFund(record)} canEdit={canEdit(record)} canEndorse={canEdit(record)} canDelete={canDelete}
                        onFund={() => openFundingForm(record)}
                        onEdit={() => openEditForm(record)}
                        onEndorse={() => setEndorsementProject(record)}
                        onDelete={() => handleDelete(record)}
                      />



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







                  {selectableSites.map((site) => (



                    <option



                      key={site.id}



                      value={site.id}
                    >
                      {site.municipality_city || "City / municipality not specified"}
                      {site.convergence_name ? ` — ${site.convergence_name}` : ""}
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







              <div className="programs-full cadp-kpi-field">
                <span>KPI Category *</span>
                <SearchableDropdown
                  label="KPI category"
                  value={form.kpiCategory === LEGACY_KPI_CATEGORY ? "Existing KPI — category unassigned" : form.kpiCategory}
                  options={kpiCategories.map(({ name }) => name)}
                  placeholder="Select or Search category"
                  searchPlaceholder="Search category"
                  onChange={(category) => updateForm("kpiCategory", category)}
                />
              </div>

              <div className="programs-full cadp-kpi-field">
                <span>KPI (Key Performance Indicators) *</span>
                <SearchableDropdown
                  label="KPI"
                  value={form.kpi}
                  options={kpiByCategory[form.kpiCategory] || []}
                  placeholder={form.kpiCategory ? "Select or Search KPI" : "Choose a category first"}
                  searchPlaceholder="Search KPI"
                  disabled={!form.kpiCategory || form.kpiCategory === LEGACY_KPI_CATEGORY}
                  onChange={(kpi) => updateForm("kpi", kpi)}
                />
              </div>







              <label>



                <span>Source of Fund (Optional)</span>







                <input



                  type="text"



                  value={



                    editingId



                      ? getSourcesOfFund(records.find((record) => record.id === editingId)).join(", ") || form.sourceOfFund



                      : form.sourceOfFund



                  }



                  readOnly={Boolean(editingId)}
                  onChange={(event) => updateForm("sourceOfFund", event.target.value)}
                  placeholder={editingId ? "" : "Enter source of fund (optional)"}



                />



                <small className="programs-auto-field-note">



                  {editingId ? "Agencies associated with this project's funding." : "Leave blank if no funding source has been identified yet."}



                </small>



              </label>







              <label>



                <span>Status *</span>







                <select disabled={!editingId}



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

