"use client";

import React, { useEffect, useState } from "react";
import { Leaf, Building, MapPin, Phone, Mail, ArrowLeft, Loader2, Save } from "lucide-react";
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

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contactEmail: "",
    contactPhone: ""
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const userSnap = await get(userRef);
        
        if (!userSnap.exists()) {
          router.push("/login");
          return;
        }

        const userData = userSnap.val();
        
        if (userData.role !== "company_admin" || userData.status !== "approved") {
          setError("Unauthorized or pending approval.");
          setLoading(false);
          return;
        }

        setCompanyId(userData.companyId);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to verify authorization.");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.location) {
      return setError("Factory name and location are required.");
    }

    setSubmitting(true);
    try {
      const factoriesRef = ref(database, "factories");
      const newFactoryRef = push(factoriesRef);
      
      await set(newFactoryRef, {
        name: formData.name,
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        companyId: companyId,
        createdAt: new Date().toISOString()
      });

      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Failed to create factory.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#022c22] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error && !companyId) {
    return (
      <div className="min-h-screen bg-[#022c22] flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .form-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          background: #022c22;
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
          background: rgba(2, 44, 34, 0.85);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        .glass-panel {
          position: relative;
          z-index: 10;
          width: 600px;
          max-width: 95vw;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          overflow: hidden;
        }

        .panel-header {
          padding: 32px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }

        .panel-header h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1;
          margin-bottom: 4px;
        }

        .panel-header p {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
        }

        .panel-body {
          padding: 40px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.4);
        }

        .form-input {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 16px 14px 48px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #10b981;
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 4px rgba(16,185,129,0.1);
        }

        .form-input::placeholder {
          color: rgba(255,255,255,0.3);
        }

        .submit-btn {
          width: 100%;
          background: #10b981;
          color: #022c22;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 32px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #34d399;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16,185,129,0.25);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
      `}} />

      <div className="form-root">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="glass-panel">
          <div className="panel-header">
            <Link href="/admin" className="back-btn">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2>Register Factory</h2>
              <p>Add a new processing facility to your company</p>
            </div>
          </div>

          <div className="panel-body">
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Factory Name</label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Building size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Haputale Estate Factory"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <MapPin size={18} />
                  </div>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Nuwara Eliya, Central Province"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email (Optional)</label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="factory@company.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone (Optional)</label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+94 77 123 4567"
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Register Factory
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
