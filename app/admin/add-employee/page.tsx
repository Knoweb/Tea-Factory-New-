"use client";

import React, { useState } from "react";
import { Leaf, Mail, Lock, Building, Factory, ArrowRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AddEmployeePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("company_A_id");
  const [factoryId, setFactoryId] = useState("factory_1_id");
  const [role, setRole] = useState("operator");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, companyId, factoryId, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      setSuccess(`Successfully created employee for ${factoryId}!`);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        .bg-layer {
          position: absolute;
          inset: -5%;
          background-image: url('/bg.png');
          background-size: cover;
          background-position: center;
          z-index: 0;
          animation: slowZoom 25s alternate infinite ease-in-out;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(0,0,0,0.4) 0%,
            rgba(0,10,8,0.95) 100%
          );
          z-index: 1;
        }

        .brand-badge {
          position: absolute;
          top: 36px;
          left: 44px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fadeSlideDown 0.7s ease both;
        }

        .brand-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.28);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.1rem;
          letter-spacing: 0.12em;
          color: #fff;
          line-height: 1;
        }

        /* Glass panel */
        .glass-panel {
          position: relative;
          z-index: 10;
          width: 460px;
          margin-right: 15vw;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(28px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          animation: fadeSlideLeft 0.75s 0.1s both;
          max-height: 96vh;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .glass-panel::-webkit-scrollbar { display: none; }

        .accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d, #f59e0b);
          background-size: 300% 100%;
          animation: gradientShift 6s ease-in-out infinite;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .panel-header {
          padding: 28px 36px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .panel-header h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1;
          margin-bottom: 5px;
        }

        .panel-header p {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
        }

        .panel-body {
          padding: 22px 36px 30px;
        }

        .field-group {
          margin-bottom: 14px;
        }

        .field-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .field-wrapper {
          position: relative;
        }

        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          pointer-events: none;
          display: flex;
        }

        .field-input {
          width: 100%;
          background: rgba(0,0,0,0.2) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 10px !important;
          height: 46px !important;
          padding-left: 44px !important;
          padding-right: 14px !important;
          font-size: 0.88rem !important;
          color: #fff !important;
          font-family: 'DM Sans', sans-serif !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }

        .field-input:focus {
          outline: none !important;
          border-color: rgba(245,158,11,0.7) !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important;
          background: rgba(0,0,0,0.4) !important;
        }

        select.field-input {
          appearance: none;
          padding-left: 44px !important;
          cursor: pointer;
        }

        select.field-input option {
          background: #0f172a;
          color: #fff;
        }

        .eye-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.35);
          display: flex;
          padding: 0;
        }

        .submit-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          border: none;
          border-radius: 12px;
          color: #000;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          box-shadow: 0 4px 20px rgba(245,158,11,0.3);
          transition: all 0.22s ease;
          text-transform: uppercase;
        }

        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 26px rgba(245,158,11,0.5); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .error-box { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); border-radius: 10px; padding: 11px 14px; font-size: 0.8rem; color: #fca5a5; text-align: center; margin-bottom: 16px; }
        .success-box { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.35); border-radius: 10px; padding: 11px 14px; font-size: 0.8rem; color: #86efac; text-align: center; margin-bottom: 16px; }

        @keyframes fadeSlideLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slowZoom { 0% { transform: scale(1); } 100% { transform: scale(1.08); } }
      `}} />

      <div className="admin-root">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="brand-badge">
          <div className="brand-icon">
            <Leaf style={{ width: 20, height: 20, color: '#f59e0b' }} />
          </div>
          <span className="brand-name">SANOTA ADMIN</span>
        </div>

        <div className="glass-panel">
          <div className="accent-bar" />

          <div className="panel-header">
            <div>
              <ShieldAlert style={{ color: '#fbbf24', width: 28, height: 28 }} />
            </div>
            <div>
              <h2>Add Employee</h2>
              <p>Securely provision a multi-tenant account</p>
            </div>
          </div>

          <div className="panel-body">
            {error && <div className="error-box">{error}</div>}
            {success && <div className="success-box">{success}</div>}

            <form onSubmit={handleCreateEmployee}>
              
              <div className="field-group">
                <label className="field-label" htmlFor="company">Company</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Building size={16} /></span>
                  <select
                    id="company"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="field-input"
                  >
                    <option value="company_A_id">Finlays Tea</option>
                    <option value="company_B_id">Dilmah</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="factory">Factory Allocation</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Factory size={16} /></span>
                  <select
                    id="factory"
                    value={factoryId}
                    onChange={(e) => setFactoryId(e.target.value)}
                    className="field-input"
                  >
                    {companyId === "company_A_id" && (
                      <>
                        <option value="factory_1_id">Uva Halpewatte Estate</option>
                        <option value="factory_2_id">Dambatenne Factory</option>
                      </>
                    )}
                    {companyId === "company_B_id" && (
                      <>
                        <option value="factory_3_id">Dilmah Central Estate</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="email">Employee Email</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Mail size={16} /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="worker@finlays.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="field-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">Temporary Password</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Lock size={16} /></span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="field-input"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Provisioning...</>
                ) : (
                  <>Create Employee Account <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link href="/login" style={{ fontSize: '0.8rem', color: '#fbbf24', textDecoration: 'none' }}>
                &larr; Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
