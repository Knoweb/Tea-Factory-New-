"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Fetch user's organizational profile from the Realtime Database
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // 2. Save the factory context so the rest of the app knows which factory to load
        localStorage.setItem("factoryId", userData.factoryId || "");
        localStorage.setItem("companyId", userData.companyId || "");
        localStorage.setItem("userRole", userData.role || "");

        // 3. Status Check
        if (userData.status === "pending") {
           await auth.signOut();
           setError("Your company account is pending approval by a Super Admin.");
           setLoading(false);
           return;
        } else if (userData.status === "rejected") {
           await auth.signOut();
           setError("Your company account registration was rejected.");
           setLoading(false);
           return;
        }

        // 3.5 Check for temporary password password change requirement
        if (userData.needsPasswordChange === true || userData.needsPasswordChange === "true") {
           router.push("/change-password");
           return;
        }

        // 4. Role-based Redirect
        if (userData.role === "super_admin") {
           router.push("/super-admin");
        } else if (userData.role === "company_admin") {
           router.push("/admin");
        } else if (userData.role === "factory_admin") {
           router.push("/factory-dashboard");
        } else {
           router.push("/"); 
        }
        return; // Stop execution after redirect
      } else {
        // User auth exists but no database profile found
        await auth.signOut();
        setError("Account profile not found in database. Please contact an administrator.");
      }
    } catch (err: any) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .split-layout {
          min-height: 100vh;
          width: 100%;
          display: flex;
          font-family: 'Outfit', sans-serif;
          background: #ffffff;
          overflow-x: hidden;
        }

        /* Left Masonry Panel */
        .left-panel {
          flex: 1.1;
          display: flex;
          background: #070e0b;
          padding: 24px;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        .masonry-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(12, 1fr);
          gap: 20px;
          width: 100%;
          height: 100%;
        }

        .grid-card {
          border-radius: 28px;
          overflow: hidden;
          position: relative;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }

        .grid-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        /* Stat Card: Rich Terracotta Orange */
        .grid-card.orange-card {
          grid-row: span 5;
          background: #f05a30;
          color: white;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* Stat Card: Elegant Emerald Green */
        .grid-card.green-card {
          grid-row: span 4;
          background: #10b981;
          color: white;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .grid-card.img-estate {
          grid-row: span 7;
          background-image: url('/tea_estate_grid.png');
          background-size: cover;
          background-position: center;
        }

        .grid-card.img-leaves {
          grid-row: span 4;
          background-image: url('/tea_leaves_grid.png');
          background-size: cover;
          background-position: center;
        }

        .grid-card.img-factory {
          grid-row: span 4;
          background-image: url('/tea_factory_grid.png');
          background-size: cover;
          background-position: center;
        }

        /* Image hover zoom overlay */
        .grid-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%);
          z-index: 1;
        }

        .grid-card.orange-card::before,
        .grid-card.green-card::before {
          display: none;
        }

        .card-stat {
          font-size: 3.8rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }

        .card-text {
          font-size: 0.95rem;
          line-height: 1.5;
          opacity: 0.95;
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        /* Right Form Panel */
        .right-panel {
          flex: 0.9;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 40px;
          position: relative;
          min-height: 100vh;
        }

        /* Form Header bar (Sign Up link) */
        .header-nav {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .signup-btn {
          padding: 8px 20px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #1f2937;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .signup-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        /* Middle Form Container */
        .form-container {
          max-width: 420px;
          width: 100%;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #10b981;
          margin-bottom: -16px;
        }

        .brand-name {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #111827;
        }

        .form-title h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        .form-title h1 span {
          color: #10b981;
        }

        .form-title p {
          font-size: 0.95rem;
          color: #6b7280;
          margin-top: 10px;
          line-height: 1.5;
        }

        /* Fields input */
        .field-group {
          margin-bottom: 20px;
        }

        .field-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          letter-spacing: 0.01em;
        }

        .field-wrapper {
          position: relative;
        }

        .field-input {
          width: 100%;
          background: #ffffff !important;
          border: 1.5px solid #e5e7eb !important;
          border-radius: 14px !important;
          height: 52px !important;
          padding-left: 20px !important;
          padding-right: 20px !important;
          font-size: 0.95rem !important;
          color: #1f2937 !important;
          font-family: 'Outfit', sans-serif !important;
          transition: all 0.2s ease !important;
          outline: none !important;
        }

        .field-input::placeholder {
          color: #9ca3af !important;
        }

        .field-input:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12) !important;
          background: #ffffff !important;
        }

        /* Password eye toggle */
        .eye-toggle {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          padding: 0;
          transition: color 0.2s;
        }

        .eye-toggle:hover {
          color: #374151;
        }

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
          margin-top: -12px;
        }

        .forgot-link {
          font-size: 0.88rem;
          color: #10b981;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #059669;
          text-decoration: underline;
        }

        /* Primary Emerald Submit Button */
        .submit-btn {
          width: 100%;
          height: 54px;
          background: #10b981;
          border: none;
          border-radius: 16px;
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .submit-btn:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.35);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          background: #a7f3d0;
          color: #ffffff;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Loading spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Error box */
        .error-box {
          background: #fef2f2;
          border: 1.5px solid #fca5a5;
          border-radius: 14px;
          padding: 14px;
          font-size: 0.88rem;
          color: #b91c1c;
          text-align: center;
          margin-bottom: 24px;
          font-weight: 500;
        }

        /* Divider line */
        .divider-container {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          width: 100%;
        }

        .divider-container::before,
        .divider-container::after {
          content: '';
          flex: 1;
          border-bottom: 1.5px solid #e5e7eb;
        }

        .divider-text {
          margin: 0 15px;
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Secondary registration button */
        .register-company-btn {
          width: 100%;
          height: 52px;
          background: #ffffff;
          border: 1.5px solid #e5e7eb;
          border-radius: 16px;
          color: #374151;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
          gap: 10px;
        }

        .register-company-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
        }

        /* Footer */
        .footer-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 500;
        }

        /* Mobile Responsive */
        @media (max-width: 1024px) {
          .left-panel {
            display: none;
          }
          .right-panel {
            flex: 1;
            padding: 30px;
          }
        }
      `}} />

      <div className="split-layout">
        
        {/* Left Side: Masonry Grid Layout (Tea Estate & Analytics) */}
        <div className="left-panel">
          <div className="masonry-grid">
            
            {/* Stat Card 1 (Orange, Row span 5) */}
            <div className="grid-card orange-card">
              <div className="card-stat">85%</div>
              <div className="card-text">
                of premium tea leaf quality is determined during the crucial withering stage.
              </div>
            </div>

            {/* Image Card 2 (Tea Leaves Bud, Row span 4) */}
            <div className="grid-card img-leaves" />

            {/* Image Card 3 (Terraced Tea Estate, Row span 7) */}
            <div className="grid-card img-estate" />

            {/* Stat Card 4 (Emerald Green, Row span 4) */}
            <div className="grid-card green-card">
              <div className="card-stat">24/7</div>
              <div className="card-text">
                automated monitoring of temperature, relative humidity, and louver status.
              </div>
            </div>

            {/* Image Card 5 (Factory Machinery, Row span 4) */}
            <div className="grid-card img-factory" />

          </div>
        </div>

        {/* Right Side: Clean, High-Contrast Light Form */}
        <div className="right-panel">
          
          {/* Header Action */}
          <div className="header-nav">
            <span>Don't have an account?</span>
            <Link href="/register" className="signup-btn">
              Sign up
            </Link>
          </div>

          {/* Form Content */}
          <div className="form-container">
            
            <div>
              <div className="brand-header">
                <Leaf size={24} fill="#10b981" />
                <span className="brand-name">SANOTA</span>
              </div>
            </div>

            <div className="form-title">
              <h1>Sign in to <span>SANOTA</span></h1>
              <p>Welcome back! Please enter your credentials below to access your organizational dashboard.</p>
            </div>

            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">Email Address</label>
                <div className="field-wrapper">
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="field-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">Password</label>
                <div className="field-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="forgot-row">
                <Link href="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="divider-container">
              <span className="divider-text">or</span>
            </div>

            <Link href="/register" className="register-company-btn">
              <Leaf size={18} className="text-emerald-500" />
              Register your company
            </Link>

          </div>

          {/* Footer Info */}
          <div className="footer-info">
            <span>© 2026 SANOTA Technology</span>
            <span>SYSTEM ONLINE</span>
          </div>

        </div>

      </div>
    </>
  );
}
