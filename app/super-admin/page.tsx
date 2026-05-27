"use client";

import React, { useEffect, useState } from "react";
import { auth, database } from "@/lib/firebase";
import { ref, onValue, update, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Shield, Building, CheckCircle, XCircle, Clock, Search, LogOut, X, Phone, User, Calendar, MapPin, Hash, Check, Trash } from "lucide-react";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

  useEffect(() => {
    // Optimistically authorize from localStorage to make page navigation instant
    if (typeof window !== "undefined" && localStorage.getItem("userRole") === "super_admin") {
      setIsSuperAdmin(true);
      setLoading(false);
    }

    let unsubscribeDatabase: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      
      try {
        // Verify Super Admin Role
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists() && snapshot.val().role === "super_admin") {
          setIsSuperAdmin(true);

          if (unsubscribeDatabase) {
            unsubscribeDatabase();
          }

          const companiesRef = ref(database, "companies");
          unsubscribeDatabase = onValue(companiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              const compList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
              }));
              
              // Sort: Pending first, then newest first
              compList.sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (a.status !== "pending" && b.status === "pending") return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });
              
              setCompanies(compList);
            } else {
              setCompanies([]);
            }
            setLoading(false);
          }, (error) => {
            console.error("Failed to load companies:", error);
            setLoading(false);
          });

        } else {
          router.push("/dashboard"); 
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDatabase) {
        (unsubscribeDatabase as () => void)();
      }
    };
  }, [router]);

  const handleApprove = async (companyId: string, adminUid: string) => {
    if (!confirm("Are you sure you want to approve this company? They will gain access to the Admin Dashboard.")) return;
    try {
      const updates: any = {};
      updates[`companies/${companyId}/status`] = "approved";
      updates[`users/${adminUid}/status`] = "approved";
      
      await update(ref(database), updates);
      
      // Update selected company status in modal if active
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany({ ...selectedCompany, status: "approved" });
      }
    } catch (err: any) {
      alert("Error approving company: " + err.message);
    }
  };

  const handleReject = async (companyId: string, adminUid: string) => {
    if (!confirm("Are you sure you want to reject this company? This action will prevent them from logging in.")) return;
    try {
      const updates: any = {};
      updates[`companies/${companyId}/status`] = "rejected";
      updates[`users/${adminUid}/status`] = "rejected";
      
      await update(ref(database), updates);
      
      // Update selected company status in modal if active
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany({ ...selectedCompany, status: "rejected" });
      }
    } catch (err: any) {
      alert("Error rejecting company: " + err.message);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm("Are you sure you want to delete this company? This action is permanent and cannot be undone.")) return;
    try {
      await update(ref(database), {
        [`companies/${companyId}`]: null
      });
      alert("Company successfully deleted.");
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany(null);
      }
    } catch (err: any) {
      alert("Error deleting company: " + err.message);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.registrationNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin || loading) {
    return (
      <div className="loading-screen">
        <style dangerouslySetInnerHTML={{__html: `
          .loading-screen {
            min-height: 100vh;
            background: #e1ede9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #cbd5e1;
            border-top-color: #0e563f;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background-color: #e1ede9;
          color: #1e293b;
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
        }

        /* Top Navbar */
        .navbar {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .nav-logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #e6f2ee;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0e563f;
        }

        .nav-title-group h1 {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #0e563f;
          line-height: 1.2;
        }

        .nav-title-group p {
          font-size: 0.68rem;
          font-weight: 700;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .logout-btn {
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          color: #ef4444;
          background: #fef2f2;
        }

        /* Main Container */
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* Header block */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .page-title h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .page-title p {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 4px;
        }

        /* Search wrapper */
        .search-wrapper {
          position: relative;
          min-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-input {
          width: 100%;
          height: 44px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding-left: 44px;
          padding-right: 16px;
          font-size: 0.92rem;
          color: #0f172a;
          font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
        }

        .search-input:focus {
          border-color: #0e563f;
          box-shadow: 0 0 0 3px rgba(14, 86, 63, 0.08);
        }

        /* Table Card Container */
        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background: #f8fafc;
          padding: 16px 24px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 18px 24px;
          font-size: 0.92rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }

        tr.clickable-row {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        tr.clickable-row:hover {
          background: #f8fafc;
        }

        .company-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 1rem;
        }

        .company-address {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 4px;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mono-text {
          font-family: monospace;
          font-size: 0.85rem;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .status-pending {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .status-approved {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .status-rejected {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }

        .action-button-group {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-approve {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-approve:hover {
          background: #047857;
          color: #ffffff;
        }

        .btn-reject {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-reject:hover {
          background: #b91c1c;
          color: #ffffff;
        }

        .btn-delete {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-delete:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }

        /* Modal Details Styling */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 1px solid #e2e8f0;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          padding: 24px 32px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header-title h3 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
        }

        .modal-header-title p {
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 4px;
        }

        .modal-close-btn {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-close-btn:hover {
          background: #cbd5e1;
          color: #0f172a;
        }

        .modal-body {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .detail-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          flex-shrink: 0;
        }

        .detail-info {
          flex: 1;
        }

        .detail-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          margin-top: 2px;
          line-height: 1.4;
        }

        .modal-footer {
          padding: 24px 32px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-modal-close {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-close:hover {
          background: #f1f5f9;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />

      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-logo-group">
          <div className="nav-icon-wrapper">
            <Shield size={22} />
          </div>
          <div className="nav-title-group">
            <h1>SANOTA</h1>
            <p>Super Admin Console</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-container">
        
        {/* Header Section */}
        <div className="page-header">
          <div className="page-title">
            <h2>
              <Building size={28} className="text-[#0e563f]" /> Company Directory
            </h2>
            <p>Select a company to view complete details, verify documents, and manage approval status.</p>
          </div>

          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search companies..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Company Details</th>
                  <th>Registration ID</th>
                  <th>Contact & Admin</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr 
                      key={company.id} 
                      className="clickable-row"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <td>
                        <div className="company-name">{company.name}</div>
                        <div className="company-address">{company.address}</div>
                      </td>
                      <td>
                        <span className="mono-text">{company.registrationNumber}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{company.contactPhone}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          Admin UID: ...{company.adminUid.slice(-6)}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: "#64748b" }}>
                          {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        {company.status === 'pending' && (
                          <span className="status-pill status-pending">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {company.status === 'approved' && (
                          <span className="status-pill status-approved">
                            <CheckCircle size={12} /> Approved
                          </span>
                        )}
                        {company.status === 'rejected' && (
                          <span className="status-pill status-rejected">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                        <div className="action-button-group">
                          {company.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(company.id, company.adminUid)}
                                className="btn-approve"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button 
                                onClick={() => handleReject(company.id, company.adminUid)}
                                className="btn-reject"
                              >
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleDelete(company.id)}
                            className="btn-delete"
                          >
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </main>

      {/* Details Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>{selectedCompany.name}</h3>
                <p>Verify registration credentials and manage tenant authorization.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCompany(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              
              <div className="detail-row">
                <div className="detail-icon-box">
                  <Building size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Company Name</div>
                  <div className="detail-value">{selectedCompany.name}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <Hash size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Registration ID</div>
                  <div className="detail-value" style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                    {selectedCompany.registrationNumber}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <Phone size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Contact Phone</div>
                  <div className="detail-value">{selectedCompany.contactPhone}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <MapPin size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Office Address</div>
                  <div className="detail-value" style={{ fontWeight: 500 }}>{selectedCompany.address}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <User size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Administrator Account</div>
                  <div className="detail-value" style={{ wordBreak: "break-all", fontSize: "0.95rem" }}>
                    User UID: {selectedCompany.adminUid}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <Calendar size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Date Submitted</div>
                  <div className="detail-value">
                    {new Date(selectedCompany.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon-box">
                  <Shield size={20} />
                </div>
                <div className="detail-info">
                  <div className="detail-label">Current Status</div>
                  <div style={{ marginTop: "6px" }}>
                    {selectedCompany.status === 'pending' && (
                      <span className="status-pill status-pending">
                        <Clock size={12} /> Pending Verification
                      </span>
                    )}
                    {selectedCompany.status === 'approved' && (
                      <span className="status-pill status-approved">
                        <CheckCircle size={12} /> Approved & Active
                      </span>
                    )}
                    {selectedCompany.status === 'rejected' && (
                      <span className="status-pill status-rejected">
                        <XCircle size={12} /> Registration Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button 
                onClick={() => handleDelete(selectedCompany.id)}
                className="btn-delete"
                style={{ padding: "10px 20px", fontSize: "0.88rem", marginRight: "auto" }}
              >
                <Trash size={14} /> Delete Company
              </button>
              {selectedCompany.status === 'pending' && (
                <div className="flex gap-2" style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => handleApprove(selectedCompany.id, selectedCompany.adminUid)}
                    className="btn-approve"
                    style={{ padding: "10px 20px", fontSize: "0.88rem" }}
                  >
                    <Check size={14} /> Approve Tenant
                  </button>
                  <button 
                    onClick={() => handleReject(selectedCompany.id, selectedCompany.adminUid)}
                    className="btn-reject"
                    style={{ padding: "10px 20px", fontSize: "0.88rem" }}
                  >
                    <X size={14} /> Reject Registration
                  </button>
                </div>
              )}
              <button className="btn-modal-close" onClick={() => setSelectedCompany(null)}>
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
