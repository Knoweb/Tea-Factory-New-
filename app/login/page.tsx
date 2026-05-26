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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        /* Full-screen background */
        .bg-layer {
          position: absolute;
          inset: -5%;
          background-image: url('/bg.png');
          background-size: cover;
          background-position: center;
          z-index: 0;
          animation: slowZoom 25s alternate infinite ease-in-out;
        }

        /* Multi-stop gradient overlay */
        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(0,0,0,0.18) 0%,
            rgba(0,0,0,0.30) 40%,
            rgba(0,10,8,0.82) 100%
          );
          z-index: 1;
        }

        /* Subtle vignette */
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%);
          z-index: 2;
        }

        /* Brand badge — top-left */
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
          animation: brandGlow 4s infinite alternate ease-in-out;
        }

        @keyframes brandGlow {
          0% { box-shadow: 0 0 10px rgba(100,255,218,0.1); }
          100% { box-shadow: 0 0 25px rgba(100,255,218,0.4); }
        }

        .brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.1rem;
          letter-spacing: 0.12em;
          color: #fff;
          line-height: 1;
          text-shadow: 0 2px 18px rgba(0,0,0,0.4);
        }

        /* Tagline bottom-left */
        .tagline {
          position: absolute;
          bottom: 48px;
          left: 44px;
          z-index: 10;
          max-width: 480px;
          animation: fadeSlideUp 0.8s 0.2s ease both;
        }

        .tagline-sub {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.55rem;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.92);
          margin-bottom: 8px;
          text-shadow: 0 1px 12px rgba(0,0,0,0.5);
        }

        .tagline-body {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.65;
          font-weight: 300;
          max-width: 400px;
        }

        /* Status chips */
        .status-chips {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.8);
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00e5c9;
          box-shadow: 0 0 6px #00e5c9;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Glass form panel */
        .glass-panel {
          position: relative;
          z-index: 10;
          width: 420px;
          margin-right: 15vw;
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.45),
            0 1px 0 rgba(255,255,255,0.12) inset,
            0 -1px 0 rgba(0,0,0,0.2) inset;
          animation: fadeSlideLeft 0.75s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Teal accent bar */
        .accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #009688, #00bfa5, #64ffda, #009688);
          background-size: 300% 100%;
          animation: gradientShift 6s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .panel-header {
          padding: 36px 36px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .panel-header h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1;
          margin-bottom: 6px;
        }

        .panel-header p {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
          letter-spacing: 0.01em;
        }

        .panel-body {
          padding: 28px 36px 36px;
        }

        /* Tab toggle */
        .tab-toggle {
          display: flex;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
          gap: 4px;
        }

        .tab-btn {
          flex: 1;
          text-align: center;
          padding: 9px 0;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-decoration: none;
          transition: all 0.22s ease;
          cursor: pointer;
        }

        .tab-btn.active {
          background: rgba(0,150,136,0.85);
          color: #fff;
          box-shadow: 0 2px 12px rgba(0,150,136,0.4);
        }

        .tab-btn.inactive {
          color: rgba(255,255,255,0.45);
        }

        .tab-btn.inactive:hover {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.06);
        }

        /* Form fields */
        .field-group {
          margin-bottom: 18px;
        }

        .field-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
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
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 10px !important;
          height: 48px !important;
          padding-left: 44px !important;
          padding-right: 14px !important;
          font-size: 0.88rem !important;
          color: #fff !important;
          font-family: 'DM Sans', sans-serif !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }

        .field-input::placeholder {
          color: rgba(255,255,255,0.25) !important;
        }

        .field-input:focus {
          outline: none !important;
          border-color: rgba(0,150,136,0.7) !important;
          box-shadow: 0 0 0 3px rgba(0,150,136,0.15) !important;
          background: rgba(255,255,255,0.10) !important;
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
          transition: color 0.2s;
        }

        .eye-toggle:hover { color: rgba(255,255,255,0.7); }

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
          margin-top: -8px;
        }

        .forgot-link {
          font-size: 0.78rem;
          color: rgba(0,230,200,0.85);
          font-weight: 500;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }

        .forgot-link:hover { color: #64ffda; }

        /* Submit button */
        .submit-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #009688 0%, #00bfa5 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(0,150,136,0.4), 0 1px 0 rgba(255,255,255,0.15) inset;
          transition: all 0.22s ease;
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.22s;
        }

        .submit-btn:hover::before { opacity: 1; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 26px rgba(0,150,136,0.5); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Loading spinner */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .register-row {
          text-align: center;
          margin-top: 22px;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.38);
        }

        .register-row a {
          color: rgba(0,230,200,0.85);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .register-row a:hover { color: #64ffda; }

        /* Error box */
        .error-box {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 0.8rem;
          color: #fca5a5;
          text-align: center;
          margin-bottom: 18px;
        }

        /* Divider line */
        .divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 22px 0;
        }

        /* System indicators */
        .sys-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sys-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.04em;
        }

        .sys-live {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: rgba(100,255,210,0.7);
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #64ffda;
          box-shadow: 0 0 6px #64ffda;
          animation: pulse 1.8s infinite;
        }

        /* Copyright */
        .copyright {
          position: absolute;
          bottom: 24px;
          right: 64px;
          z-index: 10;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.22);
          letter-spacing: 0.04em;
          animation: fadeSlideUp 0.8s 0.4s ease both;
        }

        /* Animations */
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .glass-panel {
            width: 100%;
            margin: 20px;
            margin-right: 20px;
          }
          .brand-badge { left: 20px; top: 20px; }
          .tagline { display: none; }
          .copyright { right: 20px; }
        }
      `}} />

      <div className="login-root">
        {/* Full-screen background */}
        <div className="bg-layer" />
        <div className="overlay" />
        <div className="vignette" />

        {/* Brand badge */}
        <div className="brand-badge">
          <div className="brand-icon">
            <Leaf style={{ width: 20, height: 20, color: '#64ffda' }} />
          </div>
          <span className="brand-name">SANOTA</span>
        </div>

        {/* Bottom-left tagline */}
        <div className="tagline">
          <div className="tagline-sub">Tea Factory Louver Control System</div>
          <p className="tagline-body">
            Precision automated control for optimal tea withering. Monitor and adjust louvers
            in real-time for perfect air circulation, temperature, and humidity.
          </p>
          <div className="status-chips">
            <div className="chip"><span className="chip-dot" />System Online</div>
            <div className="chip">12 Active Zones</div>
            <div className="chip">Auto Mode</div>
          </div>
        </div>

        {/* Glass login panel */}
        <div className="glass-panel" >
          <div className="accent-bar" />

          <div className="panel-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access the control panel</p>
          </div>

          <div className="panel-body">
            {/* Tab toggle removed for Option 3 (Admin-only creation) */}

            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">Email Address</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Mail size={16} /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@sanota.com"
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

              <div className="forgot-row">
                <Link href="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="register-row">
              Don't have an account?{" "}
              <Link href="/register">
                Register your company
              </Link>
            </div>

            <div className="divider" />

            <div className="sys-status">
              <span className="sys-label">© 2026 SANOTA</span>
              <span className="sys-live"><span className="live-dot" />LIVE</span>
            </div>

            {/* Public registration removed for Admin-Only access */}
          </div>
        </div>
      </div>
    </>
  );
}
