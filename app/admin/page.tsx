"use client";

import React, { useEffect, useState } from "react";
import { Leaf, Users, Building, ShieldAlert, ArrowRight, Loader2, Plus, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, query, orderByChild, equalTo, onValue } from "firebase/database";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [factories, setFactories] = useState<any[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Fetch user data with timeout
        const userRef = ref(database, `users/${user.uid}`);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8000)
        );
        const userSnap = await Promise.race([get(userRef), timeout]);
        
        if (!userSnap.exists()) {
          router.push("/login");
          return;
        }

        const userData = userSnap.val();
        
        if (userData.role !== "company_admin" || userData.status !== "approved") {
          setError(userData.status === "pending"
            ? "Your account is pending Super Admin approval."
            : "Unauthorized access."
          );
          setLoading(false);
          return;
        }

        const companyId = userData.companyId;

        if (!companyId) {
          setError("No company associated with this account.");
          setLoading(false);
          return;
        }

        // Fetch company details
        const companyRef = ref(database, `companies/${companyId}`);
        const companySnap = await get(companyRef);
        if (companySnap.exists()) {
          setCompanyData(companySnap.val());
        }

        // Listen for factories
        const factoriesQuery = query(ref(database, "factories"), orderByChild("companyId"), equalTo(companyId));
        onValue(factoriesQuery, (snapshot) => {
          if (snapshot.exists()) {
            const factsObj = snapshot.val();
            const factsArray = Object.keys(factsObj).map(key => ({
              id: key,
              ...factsObj[key]
            }));
            setFactories(factsArray);
          } else {
            setFactories([]);
          }
        }, (err) => {
          console.error("Factories error:", err);
        });

        // Listen for employees
        const employeesQuery = query(ref(database, "users"), orderByChild("companyId"), equalTo(companyId));
        onValue(employeesQuery, (snapshot) => {
          if (snapshot.exists()) {
            const empsObj = snapshot.val();
            setEmployeeCount(Object.keys(empsObj).length);
          } else {
            setEmployeeCount(0);
          }
          setLoading(false);
        }, (err) => {
          console.error("Employees error:", err);
          setLoading(false);
        });

      } catch (err: any) {
        console.error("Dashboard error:", err);
        if (err.message === "timeout") {
          setError("Connection timed out. Please check your Firebase database rules are published in the Firebase Console.");
        } else {
          setError("Failed to load dashboard data: " + err.message);
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#022c22] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
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

        .admin-root {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        .bg-layer {
          position: absolute;
          inset: -5%;
          background-image: url('/admin.jpg');
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
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

        .glass-panel {
          position: relative;
          z-index: 10;
          width: 800px;
          max-width: 95vw;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(28px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #10b981);
          background-size: 300% 100%;
          animation: gradientShift 6s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .panel-header {
          padding: 30px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .panel-header h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          letter-spacing: 0.06em;
          color: #fff;
          line-height: 1;
          margin-bottom: 5px;
        }

        .panel-header p {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.7);
          font-weight: 300;
        }

        .panel-body {
          padding: 30px 40px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
          flex-grow: 1;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-box {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .metric-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3.5rem;
          color: #10b981;
          line-height: 1;
          margin-bottom: 8px;
        }

        .metric-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #10b981;
          color: #022c22;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .add-btn:hover {
          background: #34d399;
          transform: translateY(-2px);
        }

        .factory-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .factory-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px 20px;
          text-decoration: none;
          color: #fff;
          transition: all 0.2s ease;
        }

        .factory-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(16,185,129,0.5);
          transform: translateY(-2px);
        }

        .factory-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .factory-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(16,185,129,0.15);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .factory-details h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .factory-details p {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .factory-arrow {
          color: rgba(255,255,255,0.3);
          transition: all 0.2s ease;
        }

        .factory-card:hover .factory-arrow {
          color: #10b981;
          transform: translateX(4px);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.15);
          border-radius: 12px;
        }

        .empty-state p {
          color: rgba(255,255,255,0.6);
          margin-bottom: 16px;
        }

        .logout-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.8);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
      `}} />

      <div className="admin-root">
        <div className="bg-layer" />
        <div className="overlay" />

        <div className="brand-badge">
          <div className="brand-icon">
            <Leaf style={{ width: 20, height: 20, color: '#10b981' }} />
          </div>
          <span className="brand-name">SANOTA ADMIN</span>
        </div>

        <div className="glass-panel">
          <div className="accent-bar" />

          <div className="panel-header">
            <div className="header-title">
              <ShieldAlert style={{ color: '#10b981', width: 32, height: 32 }} />
              <div>
                <h2>{companyData?.name || "Company"} Dashboard</h2>
                <p>Manage your factories and employees</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={16} /> Logout
            </button>
          </div>

          <div className="panel-body">
            
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-value">{factories.length}</span>
                <span className="metric-label">Active Factories</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{employeeCount}</span>
                <span className="metric-label">Total Employees</span>
              </div>
            </div>

            <div className="section-title">
              Your Factories
              <Link href="/admin/add-factory" className="add-btn">
                <Plus size={16} /> Add New Factory
              </Link>
            </div>

            <div className="factory-list">
              {factories.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't added any factories yet.</p>
                  <Link href="/admin/add-factory" className="add-btn" style={{ display: 'inline-flex' }}>
                    <Plus size={16} /> Register First Factory
                  </Link>
                </div>
              ) : (
                factories.map((factory) => (
                  <Link key={factory.id} href={`/admin/factory/${factory.id}`} className="factory-card">
                    <div className="factory-info">
                      <div className="factory-icon">
                        <Building size={24} />
                      </div>
                      <div className="factory-details">
                        <h3>{factory.name}</h3>
                        <p>{factory.location || 'No location set'}</p>
                      </div>
                    </div>
                    <div className="factory-arrow">
                      <ArrowRight size={20} />
                    </div>
                  </Link>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
