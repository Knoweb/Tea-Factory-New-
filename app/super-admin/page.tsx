"use client";

import React, { useEffect, useState } from "react";
import { auth, database } from "@/lib/firebase";
import { ref, onValue, update, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Shield, Building, CheckCircle, XCircle, Clock, Search, LogOut } from "lucide-react";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          loadCompanies();
        } else {
          // Unauthorized access, redirect them to normal dashboard or login
          router.push("/dashboard"); 
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadCompanies = () => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
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
      // Permission denied or other error
      console.error("Failed to load companies:", error);
      setLoading(false);
    });
  };

  const handleApprove = async (companyId: string, adminUid: string) => {
    if (!confirm("Are you sure you want to approve this company? They will gain access to the Admin Dashboard.")) return;
    try {
      const updates: any = {};
      updates[`companies/${companyId}/status`] = "approved";
      updates[`users/${adminUid}/status`] = "approved";
      
      await update(ref(database), updates);
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
    } catch (err: any) {
      alert("Error rejecting company: " + err.message);
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
      <div className="min-h-screen bg-[#020813] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c9]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020813] text-slate-200 font-sans">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-lg px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#009688] to-[#64ffda] p-[2px]">
            <div className="w-full h-full bg-[#020813] rounded-full flex items-center justify-center">
              <Shield size={20} className="text-[#64ffda]" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white uppercase font-bebas">SANOTA</h1>
            <p className="text-[0.65rem] text-[#64ffda] uppercase tracking-widest font-semibold">Super Admin Console</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Building className="text-[#00e5c9]" /> Company Directory
            </h2>
            <p className="text-sm text-slate-400 mt-1">Manage and approve registered companies.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search companies..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#00e5c9] focus:ring-1 focus:ring-[#00e5c9] w-full md:w-64 transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4 font-semibold">Company Details</th>
                  <th className="px-6 py-4 font-semibold">Registration ID</th>
                  <th className="px-6 py-4 font-semibold">Contact & Admin</th>
                  <th className="px-6 py-4 font-semibold">Date Applied</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{company.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={company.address}>
                          {company.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-300">
                        {company.registrationNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-200">{company.contactPhone}</div>
                        <div className="text-xs text-[#00e5c9] mt-0.5">Admin UID: ...{company.adminUid.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {company.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {company.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle size={12} /> Approved
                          </span>
                        )}
                        {company.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {company.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleApprove(company.id, company.adminUid)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleReject(company.id, company.adminUid)}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors border border-red-500/20"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No actions available</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </main>
    </div>
  );
}
