import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ---- SUPABASE INIT ----
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://rquvaaymanduddbwktxk.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXZhYXltYW5kdWRkYndrdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkwOTcsImV4cCI6MjA2NjM5NTA5N30.iT_cuWebAjeMangmiYSbyutvYab4TlEBZU19QZhR0ss";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- MINIMAL ICONS ----
const icons = {
  dashboard: "📊",
  jobs: "💼",
  applicants: "👤",
  signout: "⏏️",
  signin: "🔐",
  profile: "📝",
  apply: "📨",
  post: "➕"
};

// ---- MISC HELPERS ----
function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return date.toLocaleDateString();
}

// ---- AUTH COMPONENTS ----
function AuthForm({ onAuth, type, loading }) {
  // PUBLIC_INTERFACE
  // "type" is 'signin' or 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState(null);

  const isSignup = type === "signup";
  return (
    <div className="form-box">
      <h2 style={{color:'var(--primary)', marginBottom:12}}>{isSignup ? "Sign Up" : "Sign In"}</h2>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
          setError("Email and password required");
          return;
        }
        if (isSignup && !role) {
          setError("Role required");
          return;
        }
        await onAuth({ email, password, role }, setError);
      }}>
        <div className="form-row">
          <label className="form-label">Email</label>
          <input type="email" disabled={loading} value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div className="form-row">
          <label className="form-label">Password</label>
          <input type="password" disabled={loading} value={password} onChange={e=>setPassword(e.target.value)}/>
        </div>
        {isSignup && (
          <div className="form-row">
            <label className="form-label">Role</label>
            <select disabled={loading} value={role} onChange={e=>setRole(e.target.value)}>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading}>{isSignup ? "Create Account" : "Sign In"}</button>
      </form>
    </div>
  );
}

// ---- DASHBOARDS ----
function RecruiterDashboard({ user, jobs, applicants, onPostJob, loading, setShowPost }) {
  // PUBLIC_INTERFACE
  // recruiters see posted jobs and applicants table
  return (
    <div className="page-content">
      <h2 className="dash-title">Recruiter Dashboard</h2>
      <section>
        <div style={{display:'flex', justifyContent:"space-between",alignItems:"center"}}>
          <div className="dash-section-title">Your Posted Jobs</div>
          <button style={{background:"var(--primary)",color:"var(--text-primary)"}} onClick={()=>setShowPost(true)}>
            {icons.post} Post Job
          </button>
        </div>
        <DataTable
          columns={["Title","Location","Skills","Created","#Applicants"]}
          data={jobs.map(j=>[
            j.title,
            j.location,
            j.skills,
            timeAgo(j.created_at),
            applicants.filter(a=>a.job_id===j.id).length
          ])}
        />
      </section>
      <hr/>
      <section>
        <div className="dash-section-title">Applicants</div>
        <DataTable
          columns={["Name","Email","Job Title","Skills","Resume URL","Applied"]}
          data={applicants.map(a=>[
            a.profile_name,
            a.candidate_email,
            jobs.find(j=>j.id===a.job_id)?.title||"",
            a.skills,
            <a href={a.resume_url || "#"} target="_blank" rel="noreferrer">{a.resume_url ? "Link" : "-"}</a>,
            timeAgo(a.applied_at)
          ])}
        />
      </section>
    </div>
  );
}
function CandidateDashboard({ user, jobs, applications, setShowProfile, setShowApply }) {
  // PUBLIC_INTERFACE
  // candidates see job listings and their applications, can edit profile & apply
  const myApplications = applications.filter(a=>a.candidate_email===user.email);
  return (
    <div className="page-content">
      <h2 className="dash-title">Candidate Dashboard</h2>
      <section>
        <div style={{display:'flex', justifyContent:"space-between",alignItems:"center"}}>
          <div className="dash-section-title">Job Listings</div>
          <button
            style={{background:"var(--secondary)",color:"var(--text-primary)",fontWeight:"600"}}
            onClick={()=>setShowProfile(true)}
          >
            {icons.profile} Profile
          </button>
        </div>
        <DataTable
          columns={["Title","Location","Skills","Posted","Apply"]}
          data={jobs.map(j=>[
            j.title,
            j.location,
            j.skills,
            timeAgo(j.created_at),
            <button
              style={{background:'var(--accent)',color:'#fff',fontWeight:"600"}}
              onClick={()=>setShowApply(j)}
              disabled={myApplications.some(a=>a.job_id===j.id)}
            >
              {myApplications.some(a=>a.job_id===j.id) ? "✔️ Applied" : `${icons.apply} Apply`}
            </button>
          ])}
        />
      </section>
      <hr/>
      <section>
        <div className="dash-section-title">My Applications</div>
        <DataTable
          columns={["Job Title","Applied At","Resume","Skills"]}
          data={myApplications.map(a=>[
            jobs.find(j=>j.id===a.job_id)?.title || "",
            timeAgo(a.applied_at),
            <a href={a.resume_url||"#"} target="_blank" rel="noreferrer">Link</a>,
            a.skills
          ])}
        />
      </section>
    </div>
  );
}
// ---- DATA TABLE ----
function DataTable({ columns, data }) {
  // PUBLIC_INTERFACE
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col=><th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 &&
          <tr><td colSpan={columns.length} style={{color:'#999'}}>No data.</td></tr>
        }
        {data.map((row,i)=>
          <tr key={i}>
            {row.map((cell,j)=><td key={j}>{cell}</td>)}
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ---- JOB POST FORM ----
function JobPostForm({ onPost, setShow, loading }) {
  // PUBLIC_INTERFACE
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState(null);

  return (
    <div className="form-box">
      <div style={{textAlign:'right'}}>
        <button style={{float:"right",background: "#eaeaea", color: "#444"}} onClick={()=>setShow(false)}>✕</button>
      </div>
      <h3>Post New Job</h3>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!title || !location || !skills) {
          setError("Fill all fields");
          return;
        }
        await onPost({title,location,skills}, setError, ()=>setShow(false));
      }}>
        <div className="form-row">
          <label className="form-label">Job Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} disabled={loading}/>
        </div>
        <div className="form-row">
          <label className="form-label">Location</label>
          <input value={location} onChange={e=>setLocation(e.target.value)} disabled={loading}/>
        </div>
        <div className="form-row">
          <label className="form-label">Skills Required</label>
          <input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="Comma separated" disabled={loading}/>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Posting...' : 'Post Job'}</button>
      </form>
    </div>
  );
}

// ---- CANDIDATE PROFILE FORM ----
function CandidateProfileForm({ profile, onSave, setShow, loading }) {
  // PUBLIC_INTERFACE
  const [name, setName] = useState(profile?.name||"");
  const [skills, setSkills] = useState(profile?.skills||"");
  const [resumeUrl, setResumeUrl] = useState(profile?.resume_url||"");
  const [error, setError] = useState(null);

  return (
    <div className="form-box">
      <div style={{textAlign:'right'}}>
        <button style={{float:"right",background: "#eaeaea", color: "#444"}} onClick={()=>setShow(false)}>✕</button>
      </div>
      <h3>Edit Profile</h3>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!name || !skills || !resumeUrl) {
          setError("Fill all fields");
          return;
        }
        await onSave({name,skills,resume_url:resumeUrl}, setError, ()=>setShow(false));
      }}>
        <div className="form-row">
          <label className="form-label">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} disabled={loading}/>
        </div>
        <div className="form-row">
          <label className="form-label">Skills</label>
          <input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="Comma separated" disabled={loading}/>
        </div>
        <div className="form-row">
          <label className="form-label">Resume URL</label>
          <input value={resumeUrl} onChange={e=>setResumeUrl(e.target.value)} disabled={loading}/>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  );
}

// ---- JOB APPLY FORM ----
function JobApplyForm({ job, profile, onApply, setShow, loading }) {
  // PUBLIC_INTERFACE
  const [error, setError] = useState(null);

  // use profile info for resume/skills, not editable here
  return (
    <div className="form-box">
      <div style={{textAlign:'right'}}>
        <button style={{float:"right",background: "#eaeaea", color: "#444"}} onClick={()=>setShow(null)}>✕</button>
      </div>
      <h3>Apply to: <span style={{color:'var(--primary)'}}>{job.title}</span></h3>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!profile?.resume_url || !profile?.skills) {
          setError("Complete profile first!");
          return;
        }
        await onApply(job, setError, ()=>setShow(null));
      }}>
        <div className="form-row">
          <label className="form-label">Resume URL</label>
          <input value={profile?.resume_url||""} disabled />
        </div>
        <div className="form-row">
          <label className="form-label">Skills</label>
          <input value={profile?.skills||""} disabled />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading}>Apply</button>
      </form>
      <small>To change Resume/Skills, click Profile and edit.</small>
    </div>
  );
}

// ---- SIDEBAR ----
function Sidebar({ user, curr, onNav, onLogout }) {
  // PUBLIC_INTERFACE
  const links = [
    {key:"dashboard",label:"Dashboard",icon:icons.dashboard,roles:["recruiter","candidate"]},
    {key:"jobs",label:"Jobs",icon:icons.jobs,roles:["recruiter"]},
    {key:"applicants",label:"Applicants",icon:icons.applicants,roles:["recruiter"]},
    {key:"post",label:"Post Job",icon:icons.post,roles:["recruiter"]},
    {key:"profile",label:"Profile",icon:icons.profile,roles:["candidate"]},
    {key:"signout",label:"Sign Out",icon:icons.signout,roles:["recruiter","candidate"]}
  ];
  const role = user?.role || "";
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">HireIQ</div>
      <ul className="sidebar-nav">
        {links.filter(l=>l.roles.includes(role)).map(link=>
          link.key === "signout" ? (
            <li key={link.key}>
              <button onClick={onLogout} className="sidebar-link" data-icon={link.icon} style={{fontSize:17, background:"none", border:"none", cursor:"pointer", padding:0, width:'100%', textAlign:"left"}}>{link.label}</button>
            </li>
          ) : (
            <li key={link.key}>
              <span
                className={"sidebar-link"+(curr===link.key?" active":"")}
                data-icon={link.icon}
                style={{cursor:'pointer'}}
                onClick={()=>onNav(link.key)}
              >{link.label}</span>
            </li>
          )
        )}
      </ul>
    </aside>
  );
}

// ---- HEADER ----
function Header({ user, onThemeToggle, theme }) {
  // PUBLIC_INTERFACE
  return (
    <header className="header">
      <div className="header-title">HireIQ</div>
      <nav className="header-nav">
        {user && (
          <>
            <span className="header-user">{capitalize(user.role)}: {user.email}</span>
            <button className="theme-toggle" onClick={onThemeToggle}>
              {theme==="light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

// ---- MAIN APP ----
function App() {
  // PUBLIC_INTERFACE
  const [user, setUser] = useState(null); // { email, role }
  const [theme, setTheme] = useState("light");
  const [authType, setAuthType] = useState("signin");
  const [loading, setLoading] = useState(false);
  // Data
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);

  // UI section modals
  const [showJobPost, setShowJobPost] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showApplyJob, setShowApplyJob] = useState(null); // job object

  // Sidebar nav state
  const [sidebarPage, setSidebarPage] = useState("dashboard");

  // Apply the selected theme
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme", theme);
  },[theme]);

  // Load session on mount
  useEffect(()=>{
    // Note: In production, fetch user's role profile from 'profiles'
    supabase.auth.getSession().then(({ data })=>{
      if (data?.session?.user) {
        fetchProfile(data.session.user.email);
      }
    });
    supabase.auth.onAuthStateChange((event, session)=>{
      if (session?.user) fetchProfile(session.user.email);
      else setUser(null);
    })
    // eslint-disable-next-line
  },[]);

  // Fetch Jobs & Applications
  useEffect(()=>{
    fetchJobs();
    fetchApplications();
    // eslint-disable-next-line
  },[user]);

  // Fetch Applicants for Recruiters
  useEffect(()=>{
    if (user?.role==="recruiter") fetchApplicants();
    // eslint-disable-next-line
  },[jobs, user]);

  // ---- DATA OPERATIONS ----
  async function fetchProfile(email) {
    setLoading(true);
    // Get from 'profiles' table
    let { data, error } = await supabase
      .from("profiles")
      .select()
      .eq('email',email)
      .single();
    if (data) {
      setUser({ email: data.email, role: data.role });
      setProfile(data.role==="candidate"?{
        name: data.name,
        skills: data.skills,
        resume_url: data.resume_url
      }:null);
    }
    setLoading(false);
  }
  async function fetchJobs() {
    let { data } = await supabase
      .from("jobs")
      .select("*")
      .order('created_at',{ascending:false});
    setJobs(data||[]);
  }
  async function fetchApplicants() {
    let { data } = await supabase
      .from("applications")
      .select("*")
      .order('applied_at',{ascending:false});
    setApplicants(data||[]);
  }
  async function fetchApplications() {
    let { data } = await supabase
      .from("applications")
      .select("*")
      .order('applied_at',{ascending:false});
    setApplications(data||[]);
  }

  // ---- AUTH HANDLERS ----
  async function handleAuthSubmit({ email, password, role }, setError) {
    setLoading(true);
    if (authType==="signup") {
      // Sign up and save role in 'profiles' table
      let { error, data } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const newProfile = {
        email,
        role,
        ...(role==="candidate"?{ name:"",skills:"",resume_url:"" }:{})
      };
      await supabase.from("profiles").upsert([newProfile]);
      setUser({ email, role });
      setProfile(role==="candidate"?{ name:"",skills:"",resume_url:"" }:null);
    } else {
      // Sign in
      let { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Get profile for role
      fetchProfile(email);
    }
    setLoading(false);
  }

  // ---- LOGOUT ----
  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setApplications([]); setSidebarPage("dashboard");
  }

  // ---- POST JOB ----
  async function handlePostJob(fields, setError, close) {
    setLoading(true);
    // Insert into "jobs"
    const { title, location, skills } = fields;
    let { error } = await supabase.from("jobs").insert([{ title, location, skills }]);
    if (error) {
      setError("Error posting job: " + (error.message || error.details || "Unknown error"));
    } else {
      fetchJobs();
      close();
    }
    setLoading(false);
  }

  // ---- SAVE/EDIT PROFILE ----
  async function handleProfileSave(fields, setError, close) {
    setLoading(true);
    let { name, skills, resume_url } = fields;
    let { error } = await supabase
      .from("profiles")
      .update({ name, skills, resume_url })
      .eq("email", user.email);
    if (error) setError("Error saving profile");
    else {
      setProfile(fields);
      close();
    }
    setLoading(false);
  }

  // ----- APPLY TO JOB -----
  async function handleJobApply(job, setError, close) {
    setLoading(true);
    // Check for duplicate
    let applied = applications.find(a=>a.job_id===job.id && a.candidate_email===user.email);
    if (applied) {
      setError("Already applied");
      setLoading(false); return;
    }
    // 'profile' must be filled
    const { name, skills, resume_url } = profile;
    let { error } = await supabase.from("applications").insert([{
      job_id: job.id,
      candidate_email: user.email,
      profile_name: name,
      skills,
      resume_url
    }]);
    if (error) setError("Error applying");
    else {
      fetchApplications();
      close();
    }
    setLoading(false);
  }

  // ---- RENDER ----
  if (!user) {
    return (
      <div className="main-content" style={{justifyContent:"center",alignItems:"center"}}>
        <div className="page-content">
          <div style={{ maxWidth:500, margin:"0 auto"}}>
            <h1 style={{fontSize:29,color:"var(--primary)",textAlign:"center"}}>Welcome to HireIQ</h1>
            <div style={{textAlign:"center",margin:"18px 0 20px 0"}}>
              <button onClick={()=>setAuthType("signin")} disabled={authType==="signin"}>Sign In</button>
              <button onClick={()=>setAuthType("signup")} style={{marginLeft:10}} disabled={authType==="signup"}>Sign Up</button>
            </div>
            <AuthForm type={authType} onAuth={handleAuthSubmit} loading={loading} />
          </div>
        </div>
      </div>
    );
  }

  // Main logged-in layout: Sidebar + Content
  return (
    <div className="container-main">
      <Sidebar user={user} curr={sidebarPage} onNav={setSidebarPage} onLogout={handleLogout}/>
      <div className="main-content">
        <Header user={user} theme={theme} onThemeToggle={()=>setTheme(theme==="light"?"dark":"light")} />
        <div style={{flex:1}}>
        {
          // Recruiter Dashboard
          user.role === "recruiter" && (
            <RecruiterDashboard
              user={user}
              jobs={jobs.filter(j=>!!j.id)}
              applicants={applicants}
              onPostJob={handlePostJob}
              loading={loading}
              setShowPost={setShowJobPost}
            />
          )
        }
        {
          user.role === "candidate" && (
            <CandidateDashboard
              user={user}
              jobs={jobs.filter(j=>!!j.id)}
              applications={applications}
              setShowProfile={setShowProfile}
              setShowApply={setShowApplyJob}
            />
          )
        }
        </div>
      </div>
      {/* MODALS */}
      {showJobPost && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,bottom:0,
          background:"rgba(60,80,120,0.11)",
          zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"
        }}>
          <JobPostForm
            onPost={handlePostJob}
            setShow={setShowJobPost}
            loading={loading}
          />
        </div>
      )}
      {showProfile && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,bottom:0,
          background:"rgba(60,80,120,0.11)",
          zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"
        }}>
          <CandidateProfileForm
            profile={profile}
            onSave={handleProfileSave}
            setShow={setShowProfile}
            loading={loading}
          />
        </div>
      )}
      {showApplyJob && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,bottom:0,
          background:"rgba(60,80,120,0.11)",
          zIndex:30,display:"flex",alignItems:"center",justifyContent:"center"
        }}>
          <JobApplyForm
            job={showApplyJob}
            profile={profile}
            onApply={handleJobApply}
            setShow={setShowApplyJob}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}

export default App;
