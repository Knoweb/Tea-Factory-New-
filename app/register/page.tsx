"use client";

import React, { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, set, push } from "firebase/database";
import { Leaf, Building, FileText, MapPin, Phone, User, Mail, Lock, Eye, EyeOff, Check, ChevronRight, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  
  // Form State
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // UI State
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!adminName || !email) return setError("Please fill all profile fields.");
      setStep(2);
    } else if (step === 2) {
      if (!companyName || !address || !contactPhone) return setError("Please fill all required business fields.");
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!agreed) {
      return setError("You must agree to the terms.");
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Create a new company ID
      const newCompanyRef = push(ref(database, 'companies'));
      const companyId = newCompanyRef.key;

      // 2. Save company data
      await set(newCompanyRef, {
        name: companyName,
        registrationNumber: registrationNumber,
        address: address,
        contactPhone: contactPhone,
        adminUid: user.uid,
        status: "pending",
        createdAt: Date.now()
      });

      // 3. Save admin user data
      await set(ref(database, `users/${user.uid}`), {
        email: email,
        name: adminName,
        companyId: companyId,
        factoryId: null,
        role: "company_admin",
        status: "pending"
      });

      await signOut(auth); // Sign out immediately to redirect to login
      router.push("/login?registered=true"); // Redirect to login
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden relative">
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/admin.jpg')] bg-cover bg-center"></div>
        {/* Soft transparency and blur overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      </div>

      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col">
        
        {/* Header Navigation Area */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center">
              <Leaf size={18} className="text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-gray-800 tracking-wider">SANOTA</div>
          </div>
          <Link href="/login" className="text-sm font-medium text-emerald-500 hover:text-emerald-700 transition-colors">
            Back to Login
          </Link>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex w-full bg-emerald-50 text-sm font-semibold text-gray-400">
          <div className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all ${step >= 1 ? 'bg-emerald-500 text-white shadow-inner' : ''} ${step === 1 ? 'rounded-br-2xl' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-white text-emerald-500' : 'bg-gray-200 text-gray-500'}`}>1</div>
            Your Profile
          </div>
          <div className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all ${step >= 2 ? 'bg-emerald-500 text-white shadow-inner' : ''} ${step === 1 ? 'rounded-bl-2xl' : ''} ${step === 2 ? 'rounded-br-2xl' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-white text-emerald-500' : 'bg-gray-200 text-gray-500'}`}>2</div>
            Business Info
          </div>
          <div className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all ${step >= 3 ? 'bg-emerald-500 text-white shadow-inner' : ''} ${step === 2 ? 'rounded-bl-2xl' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-white text-emerald-500' : 'bg-gray-200 text-gray-500'}`}>3</div>
            Security
          </div>
        </div>

        {/* Form Content Area */}
        <div className="px-8 py-10 md:px-16 md:py-12 bg-white flex-1 relative">
          
          <div className="text-center mb-10">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-1">Step {step}</h2>
            <h1 className="text-3xl font-bold text-gray-800">
              {step === 1 && "Create Your Profile"}
              {step === 2 && "Business Information"}
              {step === 3 && "Secure Your Account"}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              {step === 1 && "Let's start with your personal administrator details."}
              {step === 2 && "Please enter information about your company."}
              {step === 3 && "Set a strong password to protect your company data."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-lg text-sm mb-6 text-center animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            
            {/* STEP 1: Profile */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Full Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={adminName} 
                        onChange={(e) => setAdminName(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="email" 
                        placeholder="admin@company.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Business Info */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Company Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Acme Corp" 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Registration / Tax ID (Optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="BR-12345678" 
                        value={registrationNumber} 
                        onChange={(e) => setRegistrationNumber(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Company Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="123 Main St, City, Country" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contact Phone *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="tel" 
                        placeholder="+1 234 567 890" 
                        value={contactPhone} 
                        onChange={(e) => setContactPhone(e.target.value)} 
                        className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Security */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-lg mx-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="pl-10 pr-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-500">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Confirm Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="pl-10 pr-10 w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 transition-all outline-none"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-500">
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start mt-6">
                  <div className="flex items-center h-5">
                    <input 
                      id="terms" 
                      type="checkbox" 
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-emerald-300 cursor-pointer" 
                    />
                  </div>
                  <label htmlFor="terms" className="ml-2 text-sm font-medium text-gray-500 cursor-pointer">
                    I agree to the <a href="#" className="text-emerald-600 hover:underline">terms and conditions</a> and <a href="#" className="text-emerald-600 hover:underline">privacy policy</a>.
                  </label>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between">
              {step > 1 ? (
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <ChevronLeft size={16} className="mr-1" /> Previous Step
                </button>
              ) : (
                <div /> // Empty div to keep 'Next' button on the right
              )}

              {step < 3 ? (
                <button 
                  type="button" 
                  onClick={handleNext}
                  className="flex items-center text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors py-2.5 px-6 rounded-lg shadow-md shadow-emerald-500/30"
                >
                  Next Step <ChevronRight size={16} className="ml-1" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors py-2.5 px-8 rounded-lg shadow-md shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Complete Registration <Check size={16} className="ml-2" />
                    </span>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
