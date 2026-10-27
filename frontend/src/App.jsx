import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

// Keep these API routes aligned with the existing Flask backend.
const API = "http://localhost:5000/api";

const Icon = ({ name, size = 18 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
};

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [data, setData] = useState(null);
  const [applied, setApplied] = useState([]);
  const [applications, setApplications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All jobs");
  const fileRef = useRef(null);

  const loadApplications = async (userId) => {
    try {
      const response = await fetch(`${API}/applications/${userId}`);
      if (!response.ok) throw new Error("Could not load your applications.");
      const rows = await response.json();
      setApplications(Array.isArray(rows) ? rows : []);
    } catch {
      // Keep the dashboard usable even if application history is temporarily unavailable.
    }
  };

  useEffect(() => {
    if (user?.id) loadApplications(user.id);
  }, [user?.id]);

  const register = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setRegistering(true);
    try {
      const response = await fetch(`${API}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || "Registration failed. Please try again.");
      if (!result.id) throw new Error(result.error || "The server did not return a user ID.");
      setUser(result);
      setNotice(`Welcome, ${result.name || form.name}! Your workspace is ready.`);
    } catch (err) {
      setError(`${err.message}. Check that the Flask backend is running at ${API}.`);
    } finally { setRegistering(false); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setNotice("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF resume."); e.target.value = ""; return;
    }
    const fd = new FormData(); fd.append("user_id", user.id); fd.append("resume", file);
    setBusy(true);
    try {
      const response = await fetch(`${API}/upload-resume`, { method: "POST", body: fd });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Resume analysis failed.");
      setData(result); setActiveNav("Overview");
      setNotice(`Resume analysed successfully. ${result.skills?.length || 0} skills detected.`);
    } catch (err) {
      setError(`${err.message} Check the Flask terminal for details.`);
    } finally { setBusy(false); if (e.target) e.target.value = ""; }
  };

  const apply = async (job) => {
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API}/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, job_id: job.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit application.");
      setApplied((current) => current.includes(job.id) ? current : [...current, job.id]);
      setApplications((current) => current.some((item) => item.id === job.id) ? current : [...current, job]);
      setNotice(`Application submitted for ${job.title} at ${job.company}.`);
    } catch (err) { setError(`${err.message} Please try again.`); }
  };

  const recommendations = data?.recommendations || [];
  const filteredJobs = useMemo(() => recommendations.filter((job) => {
    const text = `${job.title} ${job.company} ${job.description} ${(job.matched || []).join(" ")} ${(job.missing || []).join(" ")}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter = filter === "All jobs" || (filter === "Strong matches" ? job.score >= 0.5 : job.score < 0.5);
    return matchesQuery && matchesFilter;
  }), [recommendations, query, filter]);

  const averageMatch = recommendations.length ? Math.round(recommendations.reduce((sum, j) => sum + (j.score || 0), 0) / recommendations.length * 100) : 0;
  const bestMatch = recommendations.length ? Math.round(Math.max(...recommendations.map((j) => j.score || 0)) * 100) : 0;
  const navItems = [
    { label: "Overview", icon: "grid" },
    { label: "Find jobs", icon: "briefcase" },
    { label: "My applications", icon: "file" },
    { label: "Skill insights", icon: "chart" },
  ];

  const showJobs = activeNav === "Find jobs" || activeNav === "Overview";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" onClick={() => setActiveNav("Overview")}>
          <span className="brand-mark"><Icon name="spark" size={23} /></span>
          <span className="brand-name">Career<span>Pilot</span><small>AI CAREER PLATFORM</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => setActiveNav(item.label)}>
            <Icon name={item.icon} size={18} /><span>{item.label}</span>{item.label === "My applications" && applications.length > 0 && <span className="nav-count">{applications.length}</span>}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><Icon name="spark" size={17}/></div><strong>Your next step</strong><p>Close your skill gaps to unlock more opportunities.</p><button onClick={() => setActiveNav("Skill insights")}>Explore insights <Icon name="arrow" size={14}/></button></div>
          <div className="profile-mini"><div className="avatar">{user?.name?.trim()?.[0]?.toUpperCase() || "G"}</div><div className="profile-copy"><strong>{user?.name || "Guest workspace"}</strong><span>{user ? user.email || "Candidate profile" : "Register to get started"}</span></div><span className="online-dot" title="Workspace"/></div>
        </div>
      </aside>

      <main className="main-panel" id="top">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions"><span className="secure-pill"><span className="secure-dot"/> AI-powered matching</span><button className="icon-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up.")}><Icon name="bell" size={18}/></button><div className="top-avatar">{user?.name?.trim()?.[0]?.toUpperCase() || "G"}</div></div>
        </header>

        <div className="page-content">
          {error && <div className="alert alert-error"><Icon name="close" size={18}/><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16}/></button></div>}
          {notice && <div className="alert alert-success"><Icon name="check" size={18}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={16}/></button></div>}

          {!user ? (
            <section className="welcome-layout">
              <div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line"/> YOUR CAREER, ACCELERATED</div><h1>Find work that fits <span>who you are.</span></h1><p className="welcome-lead">A smarter way to discover opportunities. Upload your resume, uncover your strengths, and get job recommendations tailored to your skills.</p>
                <div className="welcome-benefits"><div><span className="benefit-check"><Icon name="check" size={14}/></span>Resume-based recommendations</div><div><span className="benefit-check"><Icon name="check" size={14}/></span>Clear skill-gap insights</div><div><span className="benefit-check"><Icon name="check" size={14}/></span>One place to track applications</div></div>
                <div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Icon name="spark" size={36}/></div><div className="floating-card float-top"><span className="float-icon purple"><Icon name="trend" size={16}/></span><span><b>Smart matching</b><small>Skills-first discovery</small></span></div><div className="floating-card float-bottom"><span className="float-icon green"><Icon name="check" size={16}/></span><span><b>Career clarity</b><small>Know what to learn next</small></span></div></div>
              </div>
              <div className="register-card"><div className="form-kicker">GET STARTED — IT'S FREE</div><h2>Create your career space</h2><p>Start with your details. You can upload your resume next.</p><form onSubmit={register} className="register-form">
                <label htmlFor="name">Full name</label><div className="input-wrap"><span><Icon name="grid" size={17}/></span><input id="name" autoComplete="name" placeholder="e.g. Aditi Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100}/></div>
                <label htmlFor="email">Email address</label><div className="input-wrap"><span><Icon name="mail" size={17}/></span><input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={120}/></div>
                <button className="primary-button full-button" disabled={registering}>{registering ? <><span className="spinner"/> Creating workspace…</> : <>Create my workspace <Icon name="arrow" size={17}/></>}</button>
              </form><div className="privacy-note"><span className="privacy-lock">⌑</span> Your details stay in your project database.</div><div className="card-footer-note"><span className="tiny-stars">✦</span> Personalized insights start with your resume.</div></div>
            </section>
          ) : (
            <>
              {activeNav === "Overview" && <>
                <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR CAREER WORKSPACE</div><h1>Welcome back, {user.name.split(" ")[0]} <span className="wave">✦</span></h1><p>Make your next move with insights built around your skills.</p></div><button className="primary-button" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="upload" size={17}/>{busy ? "Analysing resume…" : data ? "Update resume" : "Upload resume"}</button></section>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={upload} hidden/>
                <section className="metrics-grid">
                  <MetricCard icon="briefcase" tone="violet" label="Recommended roles" value={data ? recommendations.length : "—"} foot={data ? "Based on your resume" : "Upload a resume to begin"}/>
                  <MetricCard icon="trend" tone="mint" label="Best match score" value={data ? `${bestMatch}%` : "—"} foot={data ? "Your strongest-fit role" : "Personalized score"}/>
                  <MetricCard icon="file" tone="blue" label="Applications sent" value={applications.length} foot="Tracked in your workspace"/>
                  <MetricCard icon="spark" tone="amber" label="Skills identified" value={data ? (data.skills || []).length : "—"} foot={data ? "Extracted from your resume" : "PDF resume analysis"}/>
                </section>
                {!data ? <ResumePrompt busy={busy} onChoose={() => fileRef.current?.click()} /> : <>
                  <section className="content-section skills-section"><div className="section-heading"><div><span className="section-overline">YOUR PROFILE</span><h2>Skills detected</h2><p>Skills identified from your uploaded resume.</p></div><span className="subtle-count">{data.skills?.length || 0} skills</span></div><div className="skills-list">{(data.skills || []).map((skill) => <span className="skill-chip" key={skill}><span className="skill-dot"/>{skill}</span>)}{!data.skills?.length && <p className="muted-copy">No known skills found. Try a text-based PDF resume with clearly listed skills.</p>}</div></section>
                  <JobsSection jobs={filteredJobs.slice(0, 4)} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} applied={applied} applications={applications} onApply={apply} onSeeAll={() => setActiveNav("Find jobs")} compact/>
                </>}
              </>}

              {activeNav === "Find jobs" && <>
                <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> OPPORTUNITIES FOR YOU</div><h1>Find your next role.</h1><p>Explore opportunities ranked by how well they match your skills.</p></div>{data && <button className="secondary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16}/> Update resume</button>}</section>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={upload} hidden/>
                {!data ? <ResumePrompt busy={busy} onChoose={() => fileRef.current?.click()}/> : <JobsSection jobs={filteredJobs} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} applied={applied} applications={applications} onApply={apply}/>}
              </>}

              {activeNav === "My applications" && <>
                <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR JOB SEARCH</div><h1>My applications.</h1><p>Keep track of the roles you've applied to.</p></div><span className="subtle-count">{applications.length} submitted</span></section>
                <section className="content-section applications-panel"><div className="section-heading"><div><h2>Application history</h2><p>Applications saved to your project database.</p></div></div>
                  {applications.length ? <div className="application-list">{applications.map((job, index) => <div className="application-row" key={`${job.id || job.title}-${index}`}><div className="company-avatar">{(job.company || job.title || "J").slice(0, 1).toUpperCase()}</div><div className="application-info"><strong>{job.title}</strong><span>{job.company}</span></div><span className="status-pill"><span/>Submitted</span></div>)}</div> : <div className="empty-state small-empty"><div className="empty-icon"><Icon name="file" size={25}/></div><h3>No applications yet</h3><p>When you apply to a recommended job, it will appear here.</p><button className="primary-button" onClick={() => setActiveNav(data ? "Find jobs" : "Overview")}>Explore recommendations <Icon name="arrow" size={16}/></button></div>}
                </section>
              </>}

              {activeNav === "Skill insights" && <>
                <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> GROW WITH PURPOSE</div><h1>Your skill insights.</h1><p>See where you stand and what you could learn next.</p></div></section>
                {!data ? <ResumePrompt busy={busy} onChoose={() => fileRef.current?.click()}/> : <div className="insights-grid"><section className="content-section"><div className="section-heading"><div><h2>Your skill portfolio</h2><p>Skills extracted from your resume.</p></div><span className="subtle-count">{data.skills?.length || 0} detected</span></div><div className="skills-list insight-skills">{(data.skills || []).map((skill) => <span className="skill-chip" key={skill}><span className="skill-dot"/>{skill}</span>)}{!data.skills?.length && <p className="muted-copy">No known skills found in this resume.</p>}</div></section><section className="content-section"><div className="section-heading"><div><h2>Skills to build</h2><p>Frequently missing skills across your top recommendations.</p></div></div>{getTopMissing(recommendations).length ? <div className="gap-list">{getTopMissing(recommendations).map(({ skill, count }) => <div className="gap-row" key={skill}><div className="gap-label"><span>{skill}</span><small>Missing in {count} {count === 1 ? "role" : "roles"}</small></div><div className="gap-track"><div style={{ width: `${Math.min(100, count / Math.max(1, recommendations.length) * 100)}%` }}/></div></div>)}</div> : <div className="positive-state"><span><Icon name="check" size={20}/></span><strong>Looking good!</strong><p>No skill gaps found in the current recommendations.</p></div>}</section></div>}
              </>}
              <footer className="page-footer"><span>CareerPilot AI <span className="footer-dot">·</span> Built to help you move forward</span><span>Recommendations are based on the resume and job data available in this project.</span></footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, tone, label, value, foot }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon name={icon} size={19}/></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-foot">{foot}</span></article>;
}

function ResumePrompt({ busy, onChoose }) {
  return <section className="resume-prompt"><div className="resume-prompt-copy"><div className="upload-illustration"><div className="upload-doc"><Icon name="file" size={25}/><span><Icon name="check" size={13}/></span></div><div className="upload-spark spark-a">✦</div><div className="upload-spark spark-b">✧</div></div><div className="section-overline">LET'S GET YOU MATCHED</div><h2>Your next opportunity starts here.</h2><p>Upload your resume and let the AI match your experience to relevant roles, highlight missing skills, and help you focus your job search.</p><button className="primary-button" onClick={onChoose} disabled={busy}><Icon name="upload" size={17}/>{busy ? "Analysing your resume…" : "Upload PDF resume"}<Icon name="arrow" size={16}/></button><span className="file-note">PDF format · Text-based resumes work best</span></div><div className="resume-checklist"><div className="checklist-title">WHAT YOU'LL GET</div><div><span><Icon name="check" size={15}/></span><section><strong>Personalized job matches</strong><p>Roles ranked against your skills.</p></section></div><div><span><Icon name="check" size={15}/></span><section><strong>Skills gap analysis</strong><p>Know what employers are looking for.</p></section></div><div><span><Icon name="check" size={15}/></span><section><strong>Career-ready next steps</strong><p>Focus on skills that unlock roles.</p></section></div></div></section>;
}

function JobsSection({ jobs, query, setQuery, filter, setFilter, applied, applications = [], onApply, onSeeAll, compact = false }) {
  return <section className="content-section jobs-section"><div className="section-heading"><div><span className="section-overline">AI-POWERED DISCOVERY</span><h2>{compact ? "Recommended for you" : "Recommended opportunities"}</h2><p>{compact ? "A few roles worth exploring based on your resume." : "Ranked by resume relevance and required skill overlap."}</p></div>{compact && <button className="text-button" onClick={onSeeAll}>View all jobs <Icon name="arrow" size={15}/></button>}</div>
    <div className="job-toolbar"><div className="search-box"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles, companies or skills…" aria-label="Search recommended jobs"/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14}/></button>}</div><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter job matches"><option>All jobs</option><option>Strong matches</option><option>More to learn</option></select></div>
    {jobs.length ? <div className="jobs-grid">{jobs.map((job) => <JobCard key={job.id} job={job} applied={applied.includes(job.id) || applications.some((item) => item.title === job.title && item.company === job.company)} onApply={() => onApply(job)}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Icon name="search" size={24}/></div><h3>{query ? "No matching roles" : "No recommendations yet"}</h3><p>{query ? "Try another keyword or clear your search." : "Upload your resume to generate personalized job matches."}</p>{query && <button className="secondary-button" onClick={() => setQuery("")}>Clear search</button>}</div>}
  </section>;
}

function JobCard({ job, applied, onApply }) {
  const score = Math.max(0, Math.min(100, Math.round((job.score || 0) * 100)));
  const matched = job.matched || [];
  const missing = job.missing || [];
  return <article className="job-card"><div className="job-card-top"><div className="company-avatar">{(job.company || job.title || "J").slice(0, 1).toUpperCase()}</div><div className="job-title-wrap"><h3>{job.title}</h3><p>{job.company}</p></div><span className={`match-badge ${score >= 50 ? "match-high" : "match-low"}`}>{score}% match</span></div><p className="job-description">{job.description}</p><div className="match-meter"><div className="match-meter-label"><span>Skills match</span><strong>{score}%</strong></div><div className="meter-track"><div style={{ width: `${score}%` }}/></div></div>
    {matched.length > 0 && <div className="job-skills"><span className="skill-caption">YOU HAVE</span><div className="mini-chip-list">{matched.slice(0, 4).map((s) => <span className="mini-chip matched-chip" key={s}>{s}</span>)}{matched.length > 4 && <span className="mini-chip more-chip">+{matched.length - 4}</span>}</div></div>}
    <div className="job-skills missing-block"><span className="skill-caption">SKILLS TO BUILD</span><div className="mini-chip-list">{missing.length ? missing.slice(0, 4).map((s) => <span className="mini-chip missing-chip" key={s}>{s}</span>) : <span className="all-match"><Icon name="check" size={13}/> No skill gaps found</span>}{missing.length > 4 && <span className="mini-chip more-chip">+{missing.length - 4}</span>}</div></div>
    <div className="job-card-footer"><span className="job-footer-note"><Icon name="spark" size={14}/> {score >= 50 ? "Strong skill alignment" : "Opportunity to grow"}</span><button className={applied ? "applied-button" : "apply-button"} onClick={onApply} disabled={applied}>{applied ? <><Icon name="check" size={15}/> Applied</> : <>Apply now <Icon name="arrow" size={15}/></>}</button></div>
  </article>;
}

function getTopMissing(jobs) {
  const counts = new Map();
  jobs.forEach((job) => (job.missing || []).forEach((skill) => counts.set(skill, (counts.get(skill) || 0) + 1)));
  return [...counts.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)).slice(0, 8);
}

export default App;
