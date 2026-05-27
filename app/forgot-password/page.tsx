"use client";

import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Leaf, Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("A password reset recovery email has been sent successfully to " + email + ". Please check your inbox!");
      setEmail("");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("No registered account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to send reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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
          font-size: 2.6rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.01em;
          line-height: 1.15;
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

        /* Status boxes */
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

        .success-box {
          background: rgba(14, 86, 63, 0.05);
          border: 1.5px solid rgba(14, 86, 63, 0.15);
          border-radius: 14px;
          padding: 16px;
          font-size: 0.9rem;
          color: #0e563f;
          text-align: center;
          margin-bottom: 24px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* Back to login button */
        .back-login-btn {
          width: 100%;
          height: 52px;
          background: #ffffff;
          border: 1.5px solid #e5e7eb;
          border-radius: 16px;
          color: #374151;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
          gap: 10px;
        }

        .back-login-btn:hover {
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
        
        {/* Left Side: Framed Image */}
        <div className="left-panel">
          <div className="single-image-card">
            <div className="image-overlay-text">
              <h2>Tea Factory Louver Control System</h2>
              <p>Precision automated control for optimal tea withering. Reset your password to securely manage and monitor your environmental control systems.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean High-Contrast Light Form */}
        <div className="right-panel">
          
          <div className="form-container">
            
            <div>
              <div className="brand-header">
                <Leaf size={28} fill="#0e563f" />
                <span className="brand-name">SANOTA</span>
              </div>
            </div>

            <div className="form-title">
              <h1>Reset Password</h1>
              <p>Enter your email address and we'll send you a secure link to recover your account.</p>
            </div>

            {error && <div className="error-box">{error}</div>}
            
            {success ? (
              <div className="success-box">
                <CheckCircle size={28} color="#0e563f" />
                <span>{success}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
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

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <><div className="spinner" /> Sending...</>
                  ) : (
                    <>Send Recovery Link <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            )}

            <div style={{ marginTop: success ? "0px" : "10px" }}>
              <Link href="/login" className="back-login-btn">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>

          </div>

          {/* Footer */}
          <div className="footer-info">
            <span>© 2026 SANOTA Technology</span>
            <span>SYSTEM ONLINE</span>
          </div>

        </div>

      </div>
    </>
  );
}
