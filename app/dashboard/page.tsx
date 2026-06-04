"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  LayoutGrid, Activity, PowerOff, Plus, Settings, LogOut, 
  Trash2, Thermometer, Droplets, Wind, Loader2, Leaf 
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get, set, remove, onValue, query, limitToLast } from "firebase/database"

interface Trough {
  id: string
  name: string
  status?: string
  createdAt?: string
}

interface SensorReading {
  timestamp: string
  dryTemp: number
  rh: number
  wetTemp: number
  depression: number
  louverStatus: string
}

export default function DashboardOverviewPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [factoryName, setFactoryName] = useState("")
  
  // Troughs state
  const [troughs, setTroughs] = useState<Trough[]>([])
  const [latestReadings, setLatestReadings] = useState<Record<string, SensorReading>>({})
  const [loadingTroughs, setLoadingTroughs] = useState(true)
  
  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all")
  
  // Add Trough Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTroughName, setNewTroughName] = useState("")
  const [newTroughId, setNewTroughId] = useState("")
  const [addingTrough, setAddingTrough] = useState(false)
  const [addError, setAddError] = useState("")

  // Auth check
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("userRole")) {
      setAuthLoading(false)
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      try {
        const userRef = ref(database, `users/${user.uid}`)
        const userSnap = await get(userRef)
        if (!userSnap.exists()) {
          router.push("/login")
          return
        }
        const userData = userSnap.val()
        
        if (userData.needsPasswordChange === true || userData.needsPasswordChange === "true") {
          router.push("/change-password")
          return
        }

        setUserProfile(userData)
        setAuthLoading(false)
      } catch (err) {
        console.error("Auth check failed:", err)
        setAuthLoading(false)
      }
    })
    return () => unsubscribeAuth()
  }, [router])

  // Fetch factory and troughs
  useEffect(() => {
    if (authLoading || !userProfile) return

    const factoryId = userProfile.factoryId || localStorage.getItem("factoryId")
    if (!factoryId) {
      setLoadingTroughs(false)
      return
    }

    // Fetch factory name
    const factoryRef = ref(database, `factories/${factoryId}`)
    get(factoryRef).then((snap) => {
      if (snap.exists()) {
        setFactoryName(snap.val().name || "")
      }
    })

    // Listen to troughs
    const troughsRef = ref(database, `factories/${factoryId}/troughs`)
    const unsubscribeTroughs = onValue(troughsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))
        setTroughs(list)
      } else {
        setTroughs([])
      }
      setLoadingTroughs(false)
    }, (err) => {
      console.error("Troughs fetch error:", err)
      setLoadingTroughs(false)
    })

    return () => unsubscribeTroughs()
  }, [authLoading, userProfile])

  // Listen to readings of each trough
  useEffect(() => {
    if (troughs.length === 0) return

    const unsubscribers = troughs.map((trough) => {
      const readingsRef = query(ref(database, `readings/${trough.id}`), limitToLast(2))
      return onValue(readingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          // Delete latest marker to get real sequential logs
          delete data["latest"]
          
          const keys = Object.keys(data)
          if (keys.length > 0) {
            const latestKey = keys[keys.length - 1]
            const val = data[latestKey]
            
            let humidityValue = 0
            if (val.humidity !== undefined && val.humidity !== null) {
              humidityValue = Number.parseFloat(val.humidity)
            } else if (val.RH !== undefined && val.RH !== null) {
              humidityValue = Number.parseFloat(val.RH)
            } else if (val.rh !== undefined && val.rh !== null) {
              humidityValue = Number.parseFloat(val.rh)
            }

            const depressionValue = (() => {
              const tryParse = (v: any) => {
                if (v === undefined || v === null) return null
                const parsed = typeof v === "string" ? Number.parseFloat(v) : Number(v)
                return Number.isNaN(parsed) ? null : parsed
              }
              const diffF = tryParse(val.diffF)
              if (diffF !== null) return diffF
              const diffC = tryParse(val.diffC)
              if (diffC !== null) return diffC
              const wbdC = tryParse(val.WBD_C)
              if (wbdC !== null) return wbdC
              const wbdF = tryParse(val.WBD_F)
              if (wbdF !== null) return wbdF
              const depression = tryParse(val.depression)
              if (depression !== null) return depression
              return 0
            })()

            setLatestReadings((prev) => ({
              ...prev,
              [trough.id]: {
                timestamp: val.timestamp || new Date().toISOString(),
                dryTemp:
                  Number.parseFloat(val.dryTempC) ||
                  Number.parseFloat(val.dryTempF) ||
                  Number.parseFloat(val.dryTemp) ||
                  0,
                rh: humidityValue,
                wetTemp:
                  Number.parseFloat(val.wetTempC) ||
                  Number.parseFloat(val.wetTempF) ||
                  Number.parseFloat(val.wetTemp) ||
                  0,
                depression: depressionValue,
                louverStatus:
                  val.louverPercent !== undefined
                    ? `${val.louverPercent}% Open`
                    : val.louverStatus || "Closed",
              },
            }))
          }
        }
      })
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [troughs])

  // Trough online helper: online if updated in last 5 minutes
  const getTroughOnlineStatus = (troughId: string) => {
    const reading = latestReadings[troughId]
    if (!reading) return false
    const readingTime = new Date(reading.timestamp).getTime()
    const ageMs = Date.now() - readingTime
    return ageMs < 5 * 60 * 1000 // 5 minutes
  }

  // Count active / inactive
  const activeCount = troughs.filter((t) => getTroughOnlineStatus(t.id)).length
  const inactiveCount = troughs.length - activeCount

  // Filtered list
  const filteredTroughs = troughs.filter((trough) => {
    const isOnline = getTroughOnlineStatus(trough.id)
    if (activeTab === "active") return isOnline
    if (activeTab === "inactive") return !isOnline
    return true
  })

  // Handle logout
  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole")
      localStorage.removeItem("companyId")
      localStorage.removeItem("factoryId")
    }
    await signOut(auth)
    router.push("/login")
  }

  // Handle Add Trough
  const handleAddTroughSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    if (!newTroughName.trim()) return setAddError("Trough Name is required.")
    
    // Auto-generate ID if empty: Trough 1 -> trough_1
    const generatedId = newTroughId.trim() 
      ? newTroughId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
      : newTroughName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "_")

    if (!generatedId) return setAddError("Could not generate a valid Trough ID.")

    const factoryId = userProfile.factoryId || localStorage.getItem("factoryId")
    if (!factoryId) return setAddError("No factory context found.")

    setAddingTrough(true)
    try {
      // Check if trough already exists
      const troughRef = ref(database, `factories/${factoryId}/troughs/${generatedId}`)
      const snapshot = await get(troughRef)
      if (snapshot.exists()) {
        throw new Error("A trough with this ID already exists.")
      }

      await set(troughRef, {
        id: generatedId,
        name: newTroughName.trim(),
        createdAt: new Date().toISOString(),
      })

      // Close modal & reset fields
      setShowAddModal(false)
      setNewTroughName("")
      setNewTroughId("")
    } catch (err: any) {
      setAddError(err.message || "Failed to add trough.")
    } finally {
      setAddingTrough(false)
    }
  }

  // Handle delete
  const handleDeleteTrough = async (troughId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent navigating to detailed view
    if (!confirm("Are you sure you want to delete this trough? All records will be removed from your view.")) return

    const factoryId = userProfile.factoryId || localStorage.getItem("factoryId")
    if (!factoryId) return

    try {
      await remove(ref(database, `factories/${factoryId}/troughs/${troughId}`))
      // Optionally also clean up readings from `/readings/${troughId}`
      await remove(ref(database, `readings/${troughId}`))
    } catch (err) {
      console.error("Failed to delete trough:", err)
      alert("Failed to delete trough.")
    }
  }

  // Handle auto-generation of ID
  const handleNameChange = (name: string) => {
    setNewTroughName(name)
    setNewTroughId(name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "_"))
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#e1ede9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#0e563f", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-150 flex flex-col justify-between p-6 flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-600 flex items-center justify-center shadow-md">
              <Leaf className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-blue-900 tracking-wider font-sans leading-none">SAN<span className="text-amber-500">O</span>TA</span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Louver Control</span>
            </div>
          </div>

          {/* VIEWS SECTION */}
          <div className="mb-6">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-3">Views</span>
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => setActiveTab("all")}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeTab === "all" ? "bg-emerald-800 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="h-4 w-4" />
                  <span>All Troughs</span>
                </div>
                <Badge className={`rounded-lg px-2 text-[10px] font-extrabold ${activeTab === "all" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {troughs.length}
                </Badge>
              </button>

              <button 
                onClick={() => setActiveTab("active")}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeTab === "active" ? "bg-emerald-800 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4" />
                  <span>Active Troughs</span>
                </div>
                <Badge className={`rounded-lg px-2 text-[10px] font-extrabold ${activeTab === "active" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {activeCount}
                </Badge>
              </button>

              <button 
                onClick={() => setActiveTab("inactive")}
                className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${activeTab === "inactive" ? "bg-emerald-800 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2.5">
                  <PowerOff className="h-4 w-4" />
                  <span>Inactive Troughs</span>
                </div>
                <Badge className={`rounded-lg px-2 text-[10px] font-extrabold ${activeTab === "inactive" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {inactiveCount}
                </Badge>
              </button>
            </div>
          </div>

          {/* MANAGEMENT SECTION */}
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-3">Management</span>
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl font-bold text-sm border-2 border-dashed border-gray-200 hover:border-emerald-700 hover:bg-emerald-50 text-gray-500 hover:text-emerald-800 transition-all text-left"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Trough</span>
              </button>

              <button className="flex items-center gap-2.5 p-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-all text-left">
                <Settings className="h-4 w-4" />
                <span>System Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* LOGGED IN USER FOOTER */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Logged in as</span>
            <span className="text-xs font-bold text-gray-700 truncate">{userProfile?.email || "User"}</span>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 border-red-100 hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-sm h-10 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout session</span>
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
        {/* Header Title */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Monitor & Automate tea withering infrastructure {factoryName && `· ${factoryName}`}
          </p>
        </header>

        {/* LOADING STATE */}
        {loadingTroughs ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-800 animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Loading infrastructure data...</p>
          </div>
        ) : filteredTroughs.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white border border-gray-150 rounded-2xl p-10 text-center max-w-xl mx-auto my-12 flex flex-col items-center gap-5 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Leaf size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">No Troughs Found</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                {activeTab === "all" 
                  ? "This factory doesn't have any tea processing troughs registered yet. Start by adding a trough."
                  : `No ${activeTab} troughs match your filter at this moment.`}
              </p>
            </div>
            {activeTab === "all" && (
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold h-11 px-6 rounded-xl shadow-sm"
              >
                Add Your First Trough
              </Button>
            )}
          </div>
        ) : (
          /* TROUGHS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTroughs.map((trough) => {
              const reading = latestReadings[trough.id]
              const isOnline = getTroughOnlineStatus(trough.id)
              
              return (
                <Card 
                  key={trough.id} 
                  onClick={() => router.push(`/trough/${trough.id}`)}
                  className="bg-white border border-gray-100 hover:border-emerald-600 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group overflow-hidden"
                >
                  <div className="p-6">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-800">
                          <Leaf className="h-4 w-4" />
                        </div>
                        <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-emerald-800 transition-colors">
                          {trough.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`rounded-xl px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${isOnline ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                          {isOnline ? "Online" : "Offline"}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleDeleteTrough(trough.id, e)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded-xl text-gray-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Card Body - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-t border-gray-50 pt-5">
                      {/* Dry Temp */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                          <Thermometer className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Temp</span>
                          <span className="text-base font-extrabold text-gray-800">
                            {isOnline && reading ? `${reading.dryTemp.toFixed(1)}°` : "--°"}
                          </span>
                        </div>
                      </div>

                      {/* Humidity */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                          <Droplets className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Humidity</span>
                          <span className="text-base font-extrabold text-gray-800">
                            {isOnline && reading ? `${reading.rh.toFixed(1)}%` : "--%"}
                          </span>
                        </div>
                      </div>

                      {/* Depression */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Depr</span>
                          <span className="text-base font-extrabold text-gray-800">
                            {isOnline && reading ? `${reading.depression.toFixed(1)}°` : "--°"}
                          </span>
                        </div>
                      </div>

                      {/* Louver status */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 text-teal-500 rounded-xl">
                          <Wind className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Louver</span>
                          <span className="text-base font-extrabold text-gray-800">
                            {isOnline && reading ? (reading.louverStatus.includes("%") ? reading.louverStatus.split(" ")[0] : reading.louverStatus) : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* ADD NEW TROUGH DIALOG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Add New Trough</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Register a new tea processing trough</p>
              </div>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold text-center mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddTroughSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Trough Name *</label>
                <Input 
                  type="text" 
                  required
                  placeholder="e.g. Trough 1" 
                  value={newTroughName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Trough ID (Unique, lowercase/numbers) *</label>
                <Input 
                  type="text" 
                  required
                  placeholder="e.g. trough_1" 
                  value={newTroughId}
                  onChange={(e) => setNewTroughId(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, ""))}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all font-medium font-mono"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddModal(false)
                    setAddError("")
                    setNewTroughName("")
                    setNewTroughId("")
                  }}
                  className="flex-1 h-11 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={addingTrough}
                  className="flex-1 h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-sm disabled:opacity-70"
                >
                  {addingTrough ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Trough"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
