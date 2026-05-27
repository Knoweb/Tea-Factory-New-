"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

        // 3.5 Check for temporary password change requirement
        if (userData.needsPasswordChange === true || userData.needsPasswordChange === "true") {
           setRedirecting(true);
           router.push("/change-password");
           return;
        }

        // 4. Role-based Redirect
        setRedirecting(true);
        if (userData.role === "super_admin") {
           router.push("/super-admin");
        } else if (userData.role === "company_admin") {
           router.push("/admin");
        } else if (userData.role === "factory_admin") {
           router.push("/factory-dashboard");
        } else {
           router.push("/dashboard"); 
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

  if (redirecting) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0e563f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <Loader2 style={{ width: 48, height: 48, color: "#10b981", animation: "spin 1s linear infinite" }} />
        <h2 style={{ color: "#ffffff", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
          Access Granted
        </h2>
        <p style={{ color: "#a7f3d0", fontSize: "0.95rem", opacity: 0.9 }}>
          Preparing your personalized dashboard...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: "#e1ede9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#0e563f", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .split-layout {
          min-height: 100vh;
          width: 100%;
          display: flex;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #ffffff;
          overflow-x: hidden;
        }

        /* Left Panel */
        .left-panel {
          flex: 1.4;
          display: flex;
          background: #e1ede9ff;
          padding: 24px;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        .single-image-card {
          width: 100%;
          height: 100%;
          border-radius: 28px;
          background-image: url('/bg.png');
          background-size: cover;
          background-position: center;
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 40px;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .single-image-card:hover {
          transform: scale(1.005);
        }

        .single-image-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%);
          border-radius: 28px;
          z-index: 1;
        }

        .image-overlay-text {
          position: relative;
          z-index: 2;
          color: #ffffff;
        }

        .image-overlay-text h2 {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .image-overlay-text p {
          font-size: 1.05rem;
          opacity: 0.9;
          font-weight: 400;
          max-width: 440px;
          line-height: 1.5;
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
          flex: 0.6;
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
          gap: 20px;
        }

        .brand-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #0e563f;
          margin-bottom: -8px;
        }

        .brand-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #0e563f;
        }

        .form-title {
          text-align: center;
        }

        .form-title h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 3rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.01em;
          line-height: 1.15;
        }

        .form-title h1 span {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          color: #0e563f;
          font-size: 2.6rem;
        }

        .form-title p {
          font-size: 0.92rem;
          color: #6b7280;
          margin-top: 8px;
          line-height: 1.45;
        }

        /* Fields input */
        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 0.95rem;
          font-weight: 700;
          color: #1f2937;
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
          font-family: 'Plus Jakarta Sans', sans-serif !important;
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
          margin: 10px 0;
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
        
        {/* Left Side: Single Framed Premium Image Card */}
        <div className="left-panel">
          <div className="single-image-card">
            <div className="image-overlay-text">
              <h2>Tea Factory Louver Control System</h2>
              <p>Precision automated control for optimal tea withering. Monitor and adjust louvers in real-time for perfect air circulation, temperature, and humidity.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean, High-Contrast Light Form */}
        <div className="right-panel">
          
          {/* Form Content */}
          <div className="form-container">
            
            <div>
              <div className="brand-header">
                <Leaf size={28} fill="#0e563f" />
                <span className="brand-name">SANOTA</span>
              </div>
            </div>

            <div className="form-title">
              <h1>Welcome back!</h1>
              <p>Please enter your credentials below to access your organizational dashboard.</p>
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