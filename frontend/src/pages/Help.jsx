import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProtectedAuth } from "../components/auth/ProtectedRoute";
import "./Help.css";

const CONTRIBUTORS = ["super_admin", "admin", "user"];
const MANAGERS = ["super_admin", "admin"];
const ROLE_NAMES = { super_admin: "Super Admin", admin: "Admin", user: "User", viewer: "Viewer" };

const GUIDES = [
  { id: "start", title: "Getting started", description: "Find your way around the portal.", path: "/dashboard", action: "Open Dashboard", articles: [
    { title: "Navigate the system", steps: ["Start from Dashboard to view the overview.", "Use the top navigation to open a module. Your role determines which modules appear.", "On smaller screens, open the menu button to see navigation links.", "Use Help whenever you need guidance. To leave your account, use Sign Out."] },
  ] },
  { id: "sites", title: "CADP sites", description: "Register sites and select their barangays.", roles: MANAGERS, path: "/cadp-sites/register", action: "Open CADP Sites", articles: [
    { title: "Register a CADP site", steps: ["Open CADP Site Registration and choose Register CADP Site.", "Select a province, then a municipality / city. Location choices are limited to Region I.", "Open Barangays. Search the list and check one or more barangays. Selected barangays appear below the field.", "Select Year Started and enter the Convergence Name.", "Choose Register CADP Site. A success message confirms the save."] },
    { title: "Edit an existing site", steps: ["Find the site using search or the province filter.", "Choose Edit, update the fields, and select Save Changes.", "Changing province or municipality clears the barangay selections. Select the appropriate barangays again.", "An exact duplicate site entry cannot be registered again."] },
  ] },
  { id: "profiles", title: "CADP profiles", description: "Find a site and work with its profile.", roles: CONTRIBUTORS, path: "/cadp-profile", action: "Open CADP Profiles", articles: [
    { title: "Work with a CADP profile", steps: ["Open CADP Profile from the navigation.", "Find the registered CADP site you want to view.", "Open its profile and complete or update the information available to your account.", "Review the information before saving. If the site is missing, ask an Admin to check its registration."] },
  ] },
  { id: "programs", title: "Programs / Projects", description: "Choose KPIs, set targets, and find projects.", roles: CONTRIBUTORS, path: "/programs-projects", action: "Open Programs / Projects", articles: [
    { title: "Add a program or project", steps: ["Open Programs / Projects and choose Add Program / Project.", "Select the CADP site and describe the proposed inputs, activities, or interventions.", "Open KPI Category. Choose from the list or type in Search category. Then choose or search for a KPI in that category.", "Review the source agency and status, then enter the physical and financial targets for the applicable target years.", "Review all required fields and save the program / project."] },
    { title: "Use site, year, agency, and search filters", steps: ["Choose the CADP site or municipality and target year you want to inspect.", "Choose All Agencies to see combined funding, or choose an agency to see its own contribution.", "The original project agency can appear even when its contribution is zero. Contributing agencies also appear in the agency filter.", "Use search to narrow the results. If no records appear, clear search and broaden the filters."] },
  ] },
  { id: "funding", title: "Funding requests", description: "Endorse, accept, transfer, and add funding.", roles: CONTRIBUTORS, path: "/programs-projects", action: "Open Programs / Projects", articles: [
    { title: "Send a request for funding", steps: ["Find the project and open its enabled Actions menu.", "Choose the endorsement / funding request action.", "Select the receiving agency and write the request message.", "Send the request, then check the Sent tab in Funding Requests for its status."] },
    { title: "Accept or transfer a received request", steps: ["Open Funding Requests and select Inbox.", "Open the request and review the project, sender, and message.", "Choose Accept to give your agency access to the shared project and its funding actions.", "For a pending request, you can choose Transfer, select an eligible different agency, review the message, and submit. The sending agency and other excluded agencies are not available in the transfer list.", "Accepted requests remain in the history. The funding request inbox has no Delete action."] },
    { title: "Add a funding contribution", steps: ["Your agency can use Actions on its own projects. For another agency's project, accept its funding request first.", "Open Actions and choose Add Fund.", "Select the target year, review the project target and current fund, and enter the contribution amount.", "The Source of Fund is based on your account agency. Save the contribution and review the updated funding totals."] },
  ] },
  { id: "administration", title: "Administration", description: "Find the administrative modules for your role.", roles: MANAGERS, path: "/maintenance-logs", action: "Open Maintenance Logs", articles: [
    { title: "Administrative access", steps: ["Admins and Super Admins can open CADP Site Registration and Maintenance Logs.", "User Management is available to Super Admins only.", "Use the module controls available to your role. If an action is unavailable, check your assigned role and agency with the system administrator."] },
  ] },
  { id: "account", title: "Account & troubleshooting", description: "Resolve access issues and report a problem.", articles: [
    { title: "Check your role and agency", steps: ["Check the agency shown in the header. Funding contributions use this agency automatically.", "If the agency or permissions are incorrect, ask the system administrator to review your account.", "If your session becomes unavailable, sign out and sign in again. For a forgotten password, use Forgot Password on the login page."] },
    { title: "Report a problem", steps: ["Note the module, the action you were trying, and the exact error message.", "Take a screenshot and record the selected site, year, or agency filters if relevant.", "Send these details to your system administrator through your usual support channel. Do not include your password."] },
  ] },
];

const FAQS = [
  { question: "Why can't I see a module?", answer: "Modules depend on your role. Viewers can use Dashboard and Help. Users also have CADP Profile and Programs / Projects. Admins have site registration and maintenance logs. User Management is reserved for Super Admins." },
  { question: "Why are a project's Actions disabled?", answer: "Your agency must accept the funding request before using Actions on another agency's project. Your agency's own projects are available immediately. Accepting a request shares access; it does not duplicate the project or change its original agency.", roles: CONTRIBUTORS },
  { question: "Why is the KPI field disabled?", answer: "Choose a KPI category first. The KPI list then shows only indicators from that category. Changing the category clears the previous KPI. For an older unassigned KPI, select a category to choose a replacement.", roles: CONTRIBUTORS },
  { question: "Can I select more than one barangay?", answer: "Yes. Open the Barangays list, search if needed, and check each barangay to include. Remove a selection by unchecking it or using its remove button. Select the barangays again after changing province or municipality.", roles: MANAGERS },
  { question: "Why does an agency show a zero contribution?", answer: "The original agency can own the project without having added funding. An agency filter shows that agency's contribution only, while All Agencies shows the combined contributions.", roles: CONTRIBUTORS },
  { question: "Why can't I transfer to the agency that sent the request?", answer: "Transfer choices exclude the current receiving agency, the immediate sender, and the original sender. Only eligible different agencies appear. Transfer is available for pending requests.", roles: CONTRIBUTORS },
  { question: "Why are no records found?", answer: "Clear the search text and check the site, year, and agency filters. Try All Years and All Agencies. If the record still does not appear, ask your administrator to check it.", roles: CONTRIBUTORS },
  { question: "What does a schema cache or missing function error mean?", answer: "A required database update may not have been applied, or Supabase may need to refresh its schema cache. Share the exact error with your system administrator so they can check the database migration. Refresh the page after they apply the fix." },
];

const availableTo = (item, role) => !item.roles || item.roles.includes(role);
const matchesText = (text, query) => text.toLowerCase().includes(query);

export default function Help() {
  const { profile } = useProtectedAuth();
  const role = profile?.role || "viewer";
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const keyword = query.trim().toLowerCase();
  const allowedGuides = useMemo(() => GUIDES.filter((guide) => availableTo(guide, role)), [role]);
  const guides = useMemo(() => allowedGuides.filter((guide) => topic === "all" || guide.id === topic)
    .map((guide) => ({ ...guide, articles: guide.articles.filter((article) => !keyword ||
      matchesText([guide.title, guide.description, article.title, ...article.steps].join(" "), keyword)) }))
    .filter((guide) => guide.articles.length), [allowedGuides, topic, keyword]);
  const faqs = useMemo(() => FAQS.filter((faq) => availableTo(faq, role) &&
    (!keyword || matchesText(`${faq.question} ${faq.answer}`, keyword))), [role, keyword]);
  const articleCount = guides.reduce((total, guide) => total + guide.articles.length, 0);

  return (
    <div className="lens-help">
      <header className="lens-help__hero">
        <div><p className="lens-help__eyebrow">AMIANAN-CADP L.E.N.S.</p><h1>How can we help?</h1>
          <p>Find a guide, learn the steps, and get back to your work.</p></div>
        <span className="lens-help__role">{ROLE_NAMES[role] || "Account"} guide</span>
      </header>
      <main className="lens-help__main">
        <section className="lens-help__toolbar" aria-label="Find help">
          <label className="lens-help__search"><span>Search help</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: funding, KPI, barangay…" /></label>
          <label className="lens-help__topic"><span>Topic</span>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="all">All topics</option>
              {allowedGuides.map((guide) => <option key={guide.id} value={guide.id}>{guide.title}</option>)}
            </select></label>
          <p className="lens-help__count" role="status">{articleCount} guide{articleCount === 1 ? "" : "s"} found</p>
        </section>
        <div className="lens-help__section-heading"><h2>Step-by-step guides</h2><p>Open a guide to see the instructions.</p></div>
        {guides.length ? <div className="lens-help__grid">
          {guides.map((guide) => <section key={guide.id} className="lens-help__card">
            <h3>{guide.title}</h3><p className="lens-help__description">{guide.description}</p>
            <div className="lens-help__articles">{guide.articles.map((article) => <details key={article.title}>
              <summary>{article.title}</summary>
              <ol>{article.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </details>)}</div>
            {guide.path && <Link className="lens-help__link" to={guide.path}>{guide.action}<span aria-hidden="true"> →</span></Link>}
            {guide.id === "administration" && role === "super_admin" && <Link className="lens-help__link" to="/user-management">Open User Management<span aria-hidden="true"> →</span></Link>}
          </section>)}
        </div> : <div className="lens-help__empty"><h3>No guides match your search</h3><p>Try a shorter keyword or choose All topics.</p>
          <button type="button" onClick={() => { setQuery(""); setTopic("all"); }}>Clear filters</button></div>}
        <section className="lens-help__faq" aria-labelledby="lens-help-faq-title">
          <div className="lens-help__section-heading"><h2 id="lens-help-faq-title">Frequently asked questions</h2><p>Quick answers to common questions.</p></div>
          {faqs.length ? faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>) : <p>No questions match your search.</p>}
        </section>
        <aside className="lens-help__support"><div><h2>Still need help?</h2><p>Contact your system administrator with the module name, exact error, and a screenshot so they can check the issue.</p></div>
          <span>Never share your password.</span></aside>
      </main>
    </div>
  );
}
