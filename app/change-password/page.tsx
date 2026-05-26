"use client";

import React, { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle, Loader2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { onAuthStateChanged, updatePassword } from "firebase/auth";
import { ref, get, update } from "firebase/database";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snap = await get(userRef);
        if (snap.exists()) {
          const userData = snap.val();
          setUserRole(userData.role || "operator");
          // If they don't actually need to change password, redirect them home
          if (!userData.needsPasswordChange) {
            redirectHome(userData.role);
            return;
          }
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch user configuration.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const redirectHome = (role: string) => {
    if (role === "super_admin") {
      router.push("/super-admin");
    } else if (role === "company_admin") {
      router.push("/admin");
    } else if (role === "factory_admin") {
      router.push("/factory-dashboard");
    } else {
      router.push("/");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("No user session found. Please log in again.");
      return;
    }

    setUpdating(true);
    try {
      // 1. Update Firebase Auth Password
      await updatePassword(currentUser, newPassword);

      // 2. Update Database flag
      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        needsPasswordChange: false,
      });

      setSuccess(true);
      setTimeout(() => {
        redirectHome(userRole);
      }, 3000);

    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === "auth/requires-recent-login") {
        setError("For security, please log out and log back in to change your password.");
      } else {
        setError(err.message || "Failed to update password. Try again.");
      }
      setUpdating(false);
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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .cp-root {
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
          background: rgba(2, 44, 34, 0.9);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        .glass-panel {
          position: relative;
          z-index: 10;
          width: 460px;
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

        .panel-body { padding: 36px 36px 40px; }

        .lock-icon-wrap {
          width: 60px; height: 60px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: #10b981;
          margin-bottom: 24px;
        }

        .header-text h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .header-text p { font-size: 0.9rem; color: rgba(255,255,255,0.55); margin-bottom: 28px; line-height: 1.4; }

        .form-group { display: flex; flex-direction: column; margin-bottom: 20px; }

        .form-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

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
          padding: 13px 44px 13px 44px;
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
          padding: 15px;
          font-size: 0.98rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: 'DM Sans', sans-serif;
        }
        .submit-btn:hover:not(:disabled) {
          background: #34d399;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16,185,129,0.3);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .success-card {
          text-align: center;
          padding: 40px 24px;
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
        .success-card p { color: rgba(255,255,255,0.6); font-size: 0.92rem; }
      `}} />

      <div className="cp-root">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="glass-panel">
          <div className="accent-bar" />

          {success ? (
            <div className="success-card">
              <div className="success-icon">
                <CheckCircle size={36} color="#10b981" />
              </div>
              <h3>Password Updated!</h3>
              <p>Your password was changed successfully.</p>
              <p style={{ marginTop: 8, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
                Redirecting you to the system...
              </p>
            </div>
          ) : (
            <div className="panel-body">
              <div className="lock-icon-wrap">
                <KeyRound size={28} />
              </div>

              <div className="header-text">
                <h2>Secure Your Account</h2>
                <p>
                  You are logging in with a temporary password. Please configure a new, secure password to continue.
                </p>
              </div>

              {error && <div className="error-box">{error}</div>}

              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-wrap">
                    <div className="input-icon"><Lock size={16} /></div>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      placeholder="Min. 6 characters"
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="input-wrap">
                    <div className="input-icon"><Lock size={16} /></div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="Repeat new password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={updating} className="submit-btn">
                  {updating ? (
                    <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                  ) : (
                    "Update Password & Log In"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
