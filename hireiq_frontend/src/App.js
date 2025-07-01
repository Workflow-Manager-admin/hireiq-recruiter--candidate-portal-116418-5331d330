import React, { useState, useEffect, useContext, createContext } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

// ---- Supabase Client Setup ----
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://rquvaaymanduddbwktxk.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXZhYXltYW5kdWRkYndrdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkwOTcsImV4cCI6MjA2NjM5NTA5N30.iT_cuWebAjeMangmiYSbyutvYab4TlEBZU19QZhR0ss";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Auth Context ----
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// ---- Auth Provider ----
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // PUBLIC_INTERFACE
  /** This effect checks for user session changes and sets current user and profile. */
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    fetchSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // On user change, fetch profile if candidate
  useEffect(() => {
    if (user) {
      getProfile(user).then(setProfile);
    } else {
      setProfile(null);
    }
  }, [user]);

  // PUBLIC_INTERFACE
  async function loginRecruiter({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Recruiter role check (assuming recruiters are in the 'recruiter' table)
    const recruiterCheck = await supabase.from("recruiter").select("*").eq("user_id", data.user.id);
    if(recruiterCheck.error) throw recruiterCheck.error;
    if(recruiterCheck.data.length === 0) throw new Error("Not a recruiter account.");
    setUser(data.user);
  }

  // PUBLIC_INTERFACE
  async function registerCandidate({ email, password, full_name }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Create empty profile
    await supabase.from("candidate_profile").insert([{
      user_id: data.user.id,
      full_name
    }]);
    setUser(data.user);
  }

  // PUBLIC_INTERFACE
  async function updateCandidateProfile(profileData) {
    if (!user) return;
    // Upsert to candidate_profile
    const update = { ...profileData, user_id: user.id };
    let { error } = await supabase.from("candidate_profile")
      .upsert([update], { onConflict: ["user_id"] });
    if (error) throw error;
    setProfile({ ...profile, ...profileData });
  }

  // PUBLIC_INTERFACE
  async function getProfile(user) {
    if (!user) return null;
    // Recruiter
    const { data: recruiters } = await supabase.from("recruiter").select("*").eq("user_id", user.id);
    if (recruiters && recruiters.length) return { ...recruiters[0], role: "recruiter" };
    // Candidate
    const { data: candidates } = await supabase.from("candidate_profile").select("*").eq("user_id", user.id);
    if (candidates && candidates.length) return { ...candidates[0], role: "candidate" };
    return null;
  }

  // PUBLIC_INTERFACE
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = { user, profile, loading, loginRecruiter, registerCandidate, updateCandidateProfile, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- UI Layout Components ----

// PUBLIC_INTERFACE
function Header() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="header">
      <span className="brand" onClick={() => navigate("/")}>HireIQ</span>
      <nav className="nav">
        {user && profile?.role === "recruiter" && (
          <>
            <a href="/recruiter-dashboard">Recruiter Dashboard</a>
            <a href="/post-job">Post Job</a>
          </>
        )}
        {user && profile?.role === "candidate" && (
          <>
            <a href="/candidate-dashboard">Candidate Dashboard</a>
            <a href="/profile">Profile</a>
          </>
        )}
        {!user && (
          <>
            <a href="/login">Recruiter Login</a>
            <a href="/signup">Candidate Signup</a>
          </>
        )}
        {user && (
          <button className="btn-logout" onClick={logout}>Logout</button>
        )}
      </nav>
    </header>
  );
}

// ---- Pages ----

// PUBLIC_INTERFACE
function LandingPage() {
  return (
    <div className="container main">
      <h1>Welcome to HireIQ</h1>
      <p>Your minimal recruitment platform for modern hiring.</p>
      <div className="role-cards">
        <div className="role-card">
          <h2>Recruiter</h2>
          <p>Post jobs and manage applications.</p>
          <a className="btn-primary" href="/login">Recruiter Login</a>
        </div>
        <div className="role-card">
          <h2>Candidate</h2>
          <p>Apply to jobs and track your applications.</p>
          <a className="btn-secondary" href="/signup">Get Started</a>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function LoginPage() {
  const { loginRecruiter } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await loginRecruiter({ email, password });
      navigate("/recruiter-dashboard");
    } catch (err) {
      setErrorMsg(err.message || "Login failed");
    }
  }

  return (
    <div className="form-container">
      <h2>Recruiter Login</h2>
      <form onSubmit={handleSubmit} className="form">
        <input type="email" placeholder="Email" required value={email}
               onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required value={password}
               onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="btn-primary">Login</button>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
      </form>
      <p>
        Not a recruiter? <a href="/signup">Sign up as candidate</a>
      </p>
    </div>
  );
}

// PUBLIC_INTERFACE
function SignupPage() {
  const { registerCandidate } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await registerCandidate({ email, password, full_name: fullName });
      setSuccessMsg("Signup successful! Please complete your profile.");
      setTimeout(() => navigate("/profile"), 1400);
    } catch (err) {
      setErrorMsg(err.message || "Signup failed");
    }
  }

  return (
    <div className="form-container">
      <h2>Candidate Signup</h2>
      <form onSubmit={handleSubmit} className="form">
        <input type="text" placeholder="Full Name" required value={fullName}
          onChange={e => setFullName(e.target.value)} />
        <input type="email" placeholder="Email" required value={email}
               onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required value={password}
               onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="btn-primary">Sign Up</button>
        {successMsg && <div className="success-msg">{successMsg}</div>}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
      </form>
      <p>
        Already signed up? <a href="/login">Recruiter login</a>
      </p>
    </div>
  );
}

// PUBLIC_INTERFACE
function ProfilePage() {
  const { user, profile, updateCandidateProfile, loading } = useAuth();
  const [form, setForm] = useState({ full_name: "", skills: "", resume_url: "" });
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (profile?.role === "candidate") {
      setForm({ 
        full_name: profile.full_name || "",
        skills: profile.skills || "",
        resume_url: profile.resume_url || ""
      });
    }
  }, [profile]);

  if (loading) return <div>Loading...</div>;
  if (!user || profile?.role !== "candidate") return <Navigate to="/" />;

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    try {
      await updateCandidateProfile(form);
      setMessage("Profile updated!");
    } catch (e) {
      setMessage("Error saving profile.");
    }
  }

  return (
    <div className="form-container">
      <h2>Candidate Profile</h2>
      <form className="form" onSubmit={handleSave}>
        <input type="text" value={form.full_name} placeholder="Full Name"
          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        <input type="text" value={form.skills} placeholder="Skills (comma separated)"
          onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
        <input type="url" value={form.resume_url} placeholder="Resume URL"
          onChange={e => setForm(f => ({ ...f, resume_url: e.target.value }))} />
        <button type="submit" className="btn-primary">Save Profile</button>
        {message && <div className="info">{message}</div>}
      </form>
    </div>
  );
}

// PUBLIC_INTERFACE
function RecruiterDashboard() {
  const { user, profile, loading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    if (user && profile?.role === "recruiter") {
      fetchJobs();
    }
    // eslint-disable-next-line
  }, [user, profile]);

  async function fetchJobs() {
    let { data, error } = await supabase.from("job").select("*").eq("recruiter_id", user.id);
    if (!error) setJobs(data);
  }

  async function fetchApplicants(jobId) {
    setLoadingJob(true);
    const { data, error } = await supabase
      .from("application_full_view").select("*").eq("job_id", jobId);
    if (!error) setApplicants(data);
    setLoadingJob(false);
  }

  if (loading) return <div>Loading...</div>;
  if (!user || profile?.role !== "recruiter") return <Navigate to="/" />;

  return (
    <div className="container main">
      <h2>Posted Jobs</h2>
      {jobs?.length === 0 && (
        <p>No jobs posted yet. <a href="/post-job">Post a new job</a></p>
      )}
      <div className="job-list">
        {jobs.map(job => (
          <div className="job-card" key={job.id}>
            <div>
              <h3>{job.title}</h3>
              <span className="job-details">{job.location} — {job.type}</span>
              <p>{job.description}</p>
            </div>
            <button className="btn-accent" onClick={() => {
              setSelectedJob(job);
              fetchApplicants(job.id);
            }}>
              {selectedJob?.id === job.id ? "Applicants ↓" : "View Applicants"}
            </button>
            {selectedJob?.id === job.id && (
              <div className="applicants-list">
                {loadingJob ? (<em>Loading applicants...</em>) :
                  applicants.length === 0 ? (<span>No applicants yet.</span>) :
                  <table className="minimal-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Resume</th>
                        <th>Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map(a => (
                        <tr key={a.application_id}>
                          <td>{a.candidate_name}</td>
                          <td>{a.candidate_email}</td>
                          <td><a href={a.resume_url} target="_blank" rel="noopener noreferrer">Resume</a></td>
                          <td>{a.skills}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function CandidateDashboard() {
  const { user, profile, loading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (user && profile?.role === "candidate") {
      fetchJobs();
      fetchApplications();
    }
    // eslint-disable-next-line
  }, [user, profile]);

  async function fetchJobs() {
    const { data, error } = await supabase.from("job").select("*");
    if (!error) setJobs(data);
  }

  async function fetchApplications() {
    const { data, error } = await supabase
      .from("application_full_view").select("*").eq("candidate_id", user.id);
    if (!error) setApplications(data);
  }

  async function applyToJob(jobId) {
    setMessage("");
    // Only allow application if profile complete
    if (!profile?.skills || !profile?.resume_url) {
      setMessage("Complete your profile before applying.");
      return;
    }
    // Prevent duplicate applications
    const existing = await supabase
      .from("application").select("*")
      .eq("job_id", jobId).eq("candidate_id", user.id);
    if (existing.data && existing.data.length > 0) {
      setMessage("Already applied to this job.");
      return;
    }
    const { error } = await supabase.from("application")
      .insert([{ job_id: jobId, candidate_id: user.id }]);
    if (!error) {
      setMessage("Applied!");
      fetchApplications();
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!user || profile?.role !== "candidate") return <Navigate to="/" />;

  return (
    <div className="container main">
      <h2>Available Jobs</h2>
      <div className="job-list">
        {jobs.map(job => (
          <div className="job-card" key={job.id}>
            <div>
              <h3>{job.title}</h3>
              <span className="job-details">{job.location} — {job.type}</span>
              <p>{job.description}</p>
            </div>
            <button className="btn-secondary" onClick={() => applyToJob(job.id)}>
              Apply
            </button>
          </div>
        ))}
      </div>
      <h3>Your Applications</h3>
      <table className="minimal-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(a => (
            <tr key={a.application_id}>
              <td>{a.title}</td>
              <td>{a.status || "Applied"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message && <div className="info">{message}</div>}
    </div>
  );
}

// PUBLIC_INTERFACE
function PostJobPage() {
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", location: "", type: "" });
  const [success, setSuccess] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;
  if (!user || profile?.role !== "recruiter") return <Navigate to="/" />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    setErrorMsg("");
    // Validate for all fields
    if (!(form.title && form.location && form.description && form.type)) {
      setErrorMsg("All fields required");
      return;
    }
    const { error } = await supabase.from("job").insert([{
      ...form,
      recruiter_id: user.id
    }]);
    if (!error) {
      setSuccess("Job posted!");
      setTimeout(() => navigate("/recruiter-dashboard"), 1200);
    } else {
      setErrorMsg("Error posting job");
    }
  }
  return (
    <div className="form-container">
      <h2>Post Job</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input type="text" placeholder="Job Title" required
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input type="text" placeholder="Location" required
          value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        <input type="text" placeholder="Type (e.g. Full Time)" required
          value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
        <textarea placeholder="Description" required
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <button type="submit" className="btn-primary">Post Job</button>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
        {success && <div className="success-msg">{success}</div>}
      </form>
    </div>
  );
}

// ---- Main App Component ----
function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route path="/post-job" element={<PostJobPage />} />
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// PUBLIC_INTERFACE
function NotFound() {
  return (
    <div className="container main">
      <h2>404 Not Found</h2>
      <p>That page doesn't exist.</p>
      <a className="btn-primary" href="/">Back to Home</a>
    </div>
  );
}

export default App;
