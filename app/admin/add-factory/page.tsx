"use client";

import React, { useEffect, useState } from "react";
import {
  Building, MapPin, Mail, Phone, ArrowLeft, Loader2, Save,
  User, Lock, Eye, EyeOff, CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, push, set } from "firebase/database";

export default function AddFactoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  // Factory info
  const [factoryName, setFactoryName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Factory Admin account
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const userSnap = await get(userRef);
        if (!userSnap.exists()) { router.push("/login"); return; }
        const userData = userSnap.val();
        if (userData.role !== "company_admin" || userData.status !== "approved") {
          setError("Unauthorized access.");
          setLoading(false);
          return;
        }
        setCompanyId(userData.companyId);
        setLoading(false);
      } catch (err) {
        setError("Failed to verify authorization.");
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!factoryName || !location) return setError("Factory name and location are required.");
    if (!adminName || !adminEmail) return setError("Factory Admin name and email are required.");
    if (!password) return setError("Please set a password for the Factory Admin.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      // 1. Create factory entry first to get the factoryId
      const factoriesRef = ref(database, "factories");
      const newFactoryRef = push(factoriesRef);
      const factoryId = newFactoryRef.key!;

      // 2. Create the Factory Admin account via the secure API route
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password,
          name: adminName,
          companyId,
          factoryId,
          role: "factory_admin",
          status: "approved",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create Factory Admin account.");
      }

      // 3. Save factory data to database
      await set(newFactoryRef, {
        name: factoryName,
        location,
        contactPhone,
        adminEmail,
        adminName,
        adminUid: result.uid,
        companyId,
        createdAt: new Date().toISOString(),
      });

      setDone(true);
    } catch (err: any) {
      if (err.message?.includes("email-already-exists")) {
        setError("A user with this email already exists.");
      } else {
        setError(err.message || "Failed to register factory.");
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#022c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#10b981", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .form-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
        }

        .bg-layer {
          position: absolute;
          inset: 0;
          background-image: url('/admin.jpg');
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(2, 44, 34, 0.88);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        .glass-panel {
          position: relative;
          z-index: 10;
          width: 680px;
          max-width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          overflow: hidden;
          animation: fadeUp 0.5s ease both;
        }

        .accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #10b981);
          background-size: 300% 100%;
          animation: gradShift 6s ease infinite;
        }
        @keyframes gradShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

        .panel-header {
          padding: 28px 36px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .back-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        .header-text h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1;
          margin-bottom: 4px;
        }
        .header-text p { font-size: 0.88rem; color: rgba(255,255,255,0.5); }

        .panel-body { padding: 32px 36px 40px; }

        .section-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #10b981;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(16,185,129,0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 32px; }
        .form-grid .full { grid-column: 1 / -1; }

        .form-group { display: flex; flex-direction: column; }

        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .required { color: #f87171; margin-left: 3px; }

        .input-wrap { position: relative; }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 13px 14px 13px 44px;
          color: #fff;
          font-size: 0.92rem;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: #10b981;
          background: rgba(0,0,0,0.35);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
        }
        .form-input::placeholder { color: rgba(255,255,255,0.25); }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 4px;
          display: flex;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.8); }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 0 0 28px;
        }

        .error-box {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.88rem;
          margin-bottom: 20px;
        }

        .submit-btn {
          width: 100%;
          background: #10b981;
          color: #022c22;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 8px;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
        }
        .submit-btn:hover:not(:disabled) {
          background: #34d399;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16,185,129,0.3);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .success-card {
          text-align: center;
          padding: 48px 40px;
        }
        .success-icon {
          width: 72px; height: 72px;
          background: rgba(16,185,129,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          border: 2px solid rgba(16,185,129,0.3);
        }
        .success-card h3 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          color: #fff;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }
        .success-card p { color: rgba(255,255,255,0.6); font-size: 0.92rem; margin-bottom: 8px; }
        .creds-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 12px;
          padding: 16px 20px;
          margin: 20px 0;
          text-align: left;
        }
        .creds-box p { font-size: 0.88rem; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
        .creds-box span { color: #34d399; font-weight: 600; }
        .go-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #10b981;
          color: #022c22;
          padding: 12px 28px;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 8px;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
        }
        .go-btn:hover { background: #34d399; transform: translateY(-2px); }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .panel-body { padding: 24px 20px 32px; }
          .panel-header { padding: 20px; }
        }
      `}} />

      <div className="form-root">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="glass-panel">
          <div className="accent-bar" />

          {done ? (
            <div className="success-card">
              <div className="success-icon">
                <CheckCircle size={36} color="#10b981" />
              </div>
              <h3>Factory Registered!</h3>
              <p>The factory and its admin account have been created successfully.</p>
              <p>Share these credentials with the Factory Admin:</p>
              <div className="creds-box">
                <p>Factory: <span>{factoryName}</span></p>
                <p>Admin Name: <span>{adminName}</span></p>
                <p>Login Email: <span>{adminEmail}</span></p>
                <p>Password: <span>The one you just set</span></p>
                <p style={{ marginTop: 8, fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
                  The Factory Admin can log in at <span>/login</span> using these credentials.
                </p>
              </div>
              <button className="go-btn" onClick={() => router.push("/admin")}>
                ← Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <Link href="/admin" className="back-btn">
                  <ArrowLeft size={18} />
                </Link>
                <div className="header-text">
                  <h2>Register Factory</h2>
                  <p>Add a new facility and create its admin account</p>
                </div>
              </div>

              <div className="panel-body">
                {error && <div className="error-box">{error}</div>}

                <form onSubmit={handleSubmit}>
                  {/* Section 1: Factory Info */}
                  <div className="section-label">
                    <Building size={14} /> Factory Details
                  </div>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label className="form-label">Factory Name <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><Building size={16} /></div>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="e.g. Haputale Estate Factory"
                          value={factoryName}
                          onChange={e => setFactoryName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><MapPin size={16} /></div>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="e.g. Nuwara Eliya"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <div className="input-wrap">
                        <div className="input-icon"><Phone size={16} /></div>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="+94 77 123 4567"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Section 2: Factory Admin Account */}
                  <div className="section-label">
                    <User size={14} /> Factory Admin Account
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Admin Full Name <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><User size={16} /></div>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="e.g. Kamal Perera"
                          value={adminName}
                          onChange={e => setAdminName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Admin Email <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><Mail size={16} /></div>
                        <input
                          type="email"
                          required
                          className="form-input"
                          placeholder="admin@factory.com"
                          value={adminEmail}
                          onChange={e => setAdminEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><Lock size={16} /></div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="form-input"
                          placeholder="Min. 6 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          style={{ paddingRight: 44 }}
                        />
                        <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm Password <span className="required">*</span></label>
                      <div className="input-wrap">
                        <div className="input-icon"><Lock size={16} /></div>
                        <input
                          type={showConfirm ? "text" : "password"}
                          required
                          className="form-input"
                          placeholder="Repeat password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          style={{ paddingRight: 44 }}
                        />
                        <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="submit-btn">
                    {submitting ? (
                      <><Loader2 style={{ animation: "spin 1s linear infinite" }} size={20} /> Registering Factory...</>
                    ) : (
                      <><Save size={20} /> Register Factory & Create Admin</>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
