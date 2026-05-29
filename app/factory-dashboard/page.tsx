"use client";

import React, { useEffect, useState } from "react";
import {
  Leaf, Users, Building, ArrowRight, Loader2, Plus,
  LogOut, UserPlus, CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, query, orderByChild, equalTo, onValue } from "firebase/database";

export default function FactoryDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factoryData, setFactoryData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [showAddWorker, setShowAddWorker] = useState(false);

  // Add worker form
  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerRole, setWorkerRole] = useState("operator");
  const [addingWorker, setAddingWorker] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  useEffect(() => {
    // Optimistically authorize from localStorage to make page navigation instant
    if (typeof window !== "undefined" && localStorage.getItem("userRole") === "factory_admin") {
      setLoading(false);
    }

    let unsubscribeWorkers: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (unsubscribeWorkers) {
          unsubscribeWorkers();
          unsubscribeWorkers = null;
        }
        router.push("/login");
        return;
      }

      try {
        if (unsubscribeWorkers) unsubscribeWorkers();

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8000)
        );
        const userRef = ref(database, `users/${user.uid}`);
        const userSnap = await Promise.race([get(userRef), timeout]);

        if (!userSnap.exists()) { router.push("/login"); return; }
        const userData = userSnap.val();

        if (userData.role !== "factory_admin") {
          setError("Unauthorized. This dashboard is for Factory Admins only.");
          setLoading(false);
          return;
        }

        const { factoryId, companyId } = userData;

        // Fetch factory details
        const factorySnap = await get(ref(database, `factories/${factoryId}`));
        if (factorySnap.exists()) setFactoryData({ id: factoryId, ...factorySnap.val() });

        // Fetch company details
        const companySnap = await get(ref(database, `companies/${companyId}`));
        if (companySnap.exists()) setCompanyData(companySnap.val());

        // Listen for workers in this factory
        const workersQuery = query(
          ref(database, "users"),
          orderByChild("factoryId"),
          equalTo(factoryId)
        );
        unsubscribeWorkers = onValue(workersQuery, (snap) => {
          if (snap.exists()) {
            const obj = snap.val();
            const list = Object.keys(obj)
              .map(k => ({ uid: k, ...obj[k] }))
              .filter(u => u.role !== "factory_admin");
            setWorkers(list);
          } else {
            setWorkers([]);
          }
          setLoading(false);
        }, () => setLoading(false));

      } catch (err: any) {
        setError(err.message === "timeout"
          ? "Connection timed out. Please check Firebase rules are published."
          : "Failed to load dashboard: " + err.message);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeWorkers) unsubscribeWorkers();
    };
  }, [router]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    if (!workerName || !workerEmail || !workerPassword) return setAddError("All fields are required.");
    if (workerPassword.length < 6) return setAddError("Password must be at least 6 characters.");

    setAddingWorker(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: workerEmail,
          password: workerPassword,
          name: workerName,
          companyId: factoryData?.companyId,
          factoryId: factoryData?.id,
          role: workerRole,
          status: "approved",
          needsPasswordChange: true,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to add worker.");
      setAddSuccess(`${workerName} has been added successfully!`);
      setWorkerName(""); setWorkerEmail(""); setWorkerPassword("");
    } catch (err: any) {
      setAddError(err.message.includes("email-already-exists")
        ? "A user with this email already exists."
        : err.message);
    } finally {
      setAddingWorker(false);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("companyId");
      localStorage.removeItem("factoryId");
    }
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#e1ede9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#0e563f", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#e1ede9", display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20, textAlign: "center", fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0;transform:translateX(20px); } to { opacity:1;transform:translateX(0); } }

        body { background: #e1ede9; }

        .fd-root { min-height: 100vh; background: #e1ede9; color: #1c2e2a; font-family: 'Plus Jakarta Sans', sans-serif; }

        /* Navbar */
        .fd-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1.5px solid rgba(14, 86, 63, 0.08);
          padding: 0 40px;
          height: 72px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 4px 20px rgba(14, 86, 63, 0.02);
        }
        .fd-brand { display: flex; align-items: center; gap: 12px; }
        .fd-brand-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #0e563f, #15825f);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(14, 86, 63, 0.2);
        }
        .fd-brand-text h1 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 1.3rem; letter-spacing: 0.05em; color: #0e563f; line-height: 1;
        }
        .fd-brand-text p { font-size: 0.72rem; color: #15825f; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

        .fd-nav-right { display: flex; align-items: center; gap: 16px; }
        .fd-factory-badge {
          background: rgba(14, 86, 63, 0.06);
          border: 1px solid rgba(14, 86, 63, 0.15);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 0.85rem;
          color: #0e563f;
          font-weight: 600;
        }
        .fd-logout-btn {
          display: flex; align-items: center; gap: 6px;
          background: #fff;
          border: 1px solid rgba(14, 86, 63, 0.12);
          color: #0e563f;
          padding: 8px 16px; border-radius: 8px;
          font-size: 0.88rem; cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(14, 86, 63, 0.02);
        }
        .fd-logout-btn:hover { background: #0e563f; color: #fff; border-color: #0e563f; transform: translateY(-1px); }

        /* Main layout */
        .fd-main { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }

        /* Header */
        .fd-header { margin-bottom: 36px; animation: fadeUp 0.5s ease both; }
        .fd-header h2 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 2.5rem; letter-spacing: -0.02em;
          color: #0e563f; line-height: 1.1; margin-bottom: 8px;
        }
        .fd-header p { color: rgba(14, 86, 63, 0.6); font-size: 0.95rem; font-weight: 500; }

        /* Stats */
        .fd-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 36px; }
        .fd-stat {
          background: #fff;
          border: 1.5px solid rgba(14, 86, 63, 0.08);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(14, 86, 63, 0.02);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          animation: fadeUp 0.5s ease both;
        }
        .fd-stat:hover { transform: translateY(-3px); border-color: rgba(14, 86, 63, 0.2); box-shadow: 0 8px 30px rgba(14, 86, 63, 0.06); }
        .fd-stat:nth-child(2) { animation-delay: 0.1s; }
        .fd-stat:nth-child(3) { animation-delay: 0.2s; }
        .fd-stat-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 3rem; color: #0e563f; line-height: 1; margin-bottom: 6px;
        }
        .fd-stat-label {
          font-size: 0.78rem; font-weight: 700;
          color: rgba(14, 86, 63, 0.5);
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* Content grid */
        .fd-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }

        /* Workers list panel */
        .fd-panel {
          background: #fff;
          border: 1.5px solid rgba(14, 86, 63, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(14, 86, 63, 0.02);
          animation: fadeUp 0.5s 0.2s ease both;
        }
        .fd-panel-header {
          padding: 20px 24px;
          border-bottom: 1.5px solid rgba(14, 86, 63, 0.06);
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(14, 86, 63, 0.02);
        }
        .fd-panel-header h3 { font-size: 1.05rem; font-weight: 700; color: #0e563f; }
        .fd-panel-header span { font-size: 0.82rem; color: rgba(14, 86, 63, 0.5); font-weight: 600; }

        .fd-worker-row {
          display: flex; align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(14, 86, 63, 0.05);
          transition: background 0.15s;
        }
        .fd-worker-row:last-child { border-bottom: none; }
        .fd-worker-row:hover { background: rgba(14, 86, 63, 0.02); }
        .fd-worker-avatar {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(14, 86, 63, 0.08);
          color: #0e563f;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.95rem; margin-right: 14px; flex-shrink: 0;
          text-transform: uppercase;
        }
        .fd-worker-info { flex: 1; }
        .fd-worker-info h4 { font-size: 0.95rem; font-weight: 700; color: #0e563f; margin-bottom: 2px; }
        .fd-worker-info p { font-size: 0.78rem; color: rgba(14, 86, 63, 0.5); font-weight: 500; }
        .fd-role-badge {
          font-size: 0.72rem; font-weight: 700;
          padding: 4px 10px; border-radius: 100px;
          background: rgba(14, 86, 63, 0.06);
          color: #0e563f;
          border: 1px solid rgba(14, 86, 63, 0.12);
          text-transform: capitalize;
        }

        .fd-empty {
          padding: 48px 24px;
          text-align: center;
          color: rgba(14, 86, 63, 0.4);
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Add worker panel */
        .fd-add-panel {
          background: #fff;
          border: 1.5px solid rgba(14, 86, 63, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(14, 86, 63, 0.02);
          animation: slideIn 0.5s 0.3s ease both;
          height: fit-content;
        }
        .fd-add-header {
          padding: 20px 24px;
          border-bottom: 1.5px solid rgba(14, 86, 63, 0.06);
          display: flex; align-items: center; gap: 10px;
          background: rgba(14, 86, 63, 0.02);
        }
        .fd-add-header h3 { font-size: 1.05rem; font-weight: 700; color: #0e563f; }
        .fd-add-body { padding: 24px; }

        .fd-field { margin-bottom: 18px; }
        .fd-field label {
          display: block;
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: rgba(14, 86, 63, 0.6);
          margin-bottom: 8px;
        }
        .fd-field input, .fd-field select {
          width: 100%;
          background: #fff;
          border: 1.5px solid rgba(14, 86, 63, 0.12);
          border-radius: 10px;
          padding: 12px 14px;
          color: #0e563f;
          font-size: 0.9rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          transition: all 0.22s ease;
        }
        .fd-field input:focus, .fd-field select:focus {
          outline: none;
          border-color: #0e563f;
          box-shadow: 0 0 0 3.5px rgba(14, 86, 63, 0.08);
          background: #fff;
        }
        .fd-field input::placeholder { color: rgba(14, 86, 63, 0.3); }
        .fd-field select option { background: #fff; color: #0e563f; }

        .fd-add-error {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .fd-add-success {
          background: rgba(14, 86, 63, 0.06);
          border: 1px solid rgba(14, 86, 63, 0.15);
          color: #0e563f;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 600;
          margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }

        .fd-submit {
          width: 100%;
          background: #0e563f; color: #fff;
          border: none; border-radius: 10px;
          padding: 13px;
          font-size: 0.95rem; font-weight: 700;
          cursor: pointer; transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 12px rgba(14, 86, 63, 0.15);
        }
        .fd-submit:hover:not(:disabled) { background: #15825f; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(14, 86, 63, 0.22); }
        .fd-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .fd-grid { grid-template-columns: 1fr; }
          .fd-stats { grid-template-columns: 1fr 1fr; }
          .fd-nav { padding: 0 20px; }
          .fd-main { padding: 24px 16px; }
          .fd-factory-badge { display: none; }
        }
      `}} />

      <div className="fd-root">
        {/* Navbar */}
        <nav className="fd-nav">
          <div className="fd-brand">
            <div className="fd-brand-icon">
              <Leaf size={20} color="#fff" />
            </div>
            <div className="fd-brand-text">
              <h1>SANOTA</h1>
              <p>Factory Dashboard</p>
            </div>
          </div>
          <div className="fd-nav-right">
            {factoryData && (
              <div className="fd-factory-badge">
                <Building size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                {factoryData.name}
              </div>
            )}
            <button className="fd-logout-btn" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </nav>

        <main className="fd-main">
          {/* Header */}
          <div className="fd-header">
            <h2>{factoryData?.name || "Factory"} Dashboard</h2>
            <p>{companyData?.name && `${companyData.name} · `}{factoryData?.location}</p>
          </div>

          {/* Stats */}
          <div className="fd-stats">
            <div className="fd-stat">
              <div className="fd-stat-val">{workers.length}</div>
              <div className="fd-stat-label">Total Workers</div>
            </div>
            <div className="fd-stat">
              <div className="fd-stat-val">
                {workers.filter(w => w.role === "operator").length}
              </div>
              <div className="fd-stat-label">Operators</div>
            </div>
            <div className="fd-stat">
              <div className="fd-stat-val">
                {workers.filter(w => w.role === "supervisor").length}
              </div>
              <div className="fd-stat-label">Supervisors</div>
            </div>
          </div>

          {/* Content grid */}
          <div className="fd-grid">
            {/* Workers list */}
            <div className="fd-panel">
              <div className="fd-panel-header">
                <h3>Workers</h3>
                <span>{workers.length} registered</span>
              </div>
              {workers.length === 0 ? (
                <div className="fd-empty">
                  No workers added yet. Use the form to add your first worker.
                </div>
              ) : (
                workers.map(worker => (
                  <div key={worker.uid} className="fd-worker-row">
                    <div className="fd-worker-avatar">
                      {(worker.name || worker.email)?.[0] || "W"}
                    </div>
                    <div className="fd-worker-info">
                      <h4>{worker.name || "Unnamed"}</h4>
                      <p>{worker.email}</p>
                    </div>
                    <div className="fd-role-badge">{worker.role}</div>
                  </div>
                ))
              )}
            </div>

            {/* Add Worker form */}
            <div className="fd-add-panel">
              <div className="fd-add-header">
                <UserPlus size={18} color="#10b981" />
                <h3>Add Worker</h3>
              </div>
              <div className="fd-add-body">
                {addError && <div className="fd-add-error">{addError}</div>}
                {addSuccess && (
                  <div className="fd-add-success">
                    <CheckCircle size={16} /> {addSuccess}
                  </div>
                )}
                <form onSubmit={handleAddWorker}>
                  <div className="fd-field">
                    <label>Full Name *</label>
                    <input
                      type="text" required
                      placeholder="e.g. Nimal Perera"
                      value={workerName}
                      onChange={e => setWorkerName(e.target.value)}
                    />
                  </div>
                  <div className="fd-field">
                    <label>Email Address *</label>
                    <input
                      type="email" required
                      placeholder="worker@factory.com"
                      value={workerEmail}
                      onChange={e => setWorkerEmail(e.target.value)}
                    />
                  </div>
                  <div className="fd-field">
                    <label>Role *</label>
                    <select value={workerRole} onChange={e => setWorkerRole(e.target.value)}>
                      <option value="operator">Operator</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="technician">Technician</option>
                    </select>
                  </div>
                  <div className="fd-field">
                    <label>Temporary Password *</label>
                    <input
                      type="password" required
                      placeholder="Min. 6 characters"
                      value={workerPassword}
                      onChange={e => setWorkerPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={addingWorker} className="fd-submit">
                    {addingWorker
                      ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Adding...</>
                      : <><Plus size={18} /> Add Worker</>
                    }
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
