"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Thermometer, Droplets, Wind, Activity, Database, Wifi, LogOut, Loader2, ChevronLeft, Fan, Gauge, Zap, AlertTriangle, CheckCircle, Settings } from "lucide-react"
import Image from "next/image"
import { useRouter, useParams } from "next/navigation"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get } from "firebase/database"
import { TemperatureChart } from "@/components/temperature-chart"
import { HumidityChart } from "@/components/humidity-chart"
import { LouverStatusChart } from "@/components/louver-status-chart"
import { TemperatureChart24h } from "@/components/temperature-chart-24h"
import { HumidityChart24h } from "@/components/humidity-chart-24h"
import { LouverStatusChart24h } from "@/components/louver-status-chart-24h"

// Mock data structure matching ESP32 Firebase data
interface SensorReading {
  timestamp: string
  dryTemp: number
  rh: number
  wetTemp: number
  depression: number
  louverStatus: string
}

const firebaseConfig = {
  databaseURL: "https://tea-withering-system-4d483-default-rtdb.firebaseio.com/",
}

const isFirebaseConfigured = () => {
  return !!firebaseConfig.databaseURL
}

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error)
}

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === "AbortError"
}

const generateMockData = (): SensorReading[] => {
  const now = new Date()
  const data: SensorReading[] = []

  for (let i = 7; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000) // 5-minute intervals
    data.push({
      timestamp: timestamp.toISOString(),
      dryTemp: 76 + Math.random() * 8,
      rh: 58 + Math.random() * 12,
      wetTemp: 70 + Math.random() * 6,
      depression: 5 + Math.random() * 4,
      louverStatus: Math.random() > 0.4 ? "Open" : "Closed",
    })
  }
  return data
}

const createZeroReading = (): SensorReading => {
  return {
    timestamp: new Date().toISOString(),
    dryTemp: 0,
    rh: 0,
    wetTemp: 0,
    depression: 0,
    louverStatus: "0% Open",
  }
}

const fetchFirebaseData = async (troughId: string): Promise<SensorReading | null> => {
  try {
    if (!isFirebaseConfigured()) {
      console.log("[v0] Firebase not properly configured - missing database URL")
      return null
    }

    console.log(`[v0] Fetching data from Firebase for trough ${troughId}:`, firebaseConfig.databaseURL)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const baseUrl = firebaseConfig.databaseURL.endsWith("/")
      ? firebaseConfig.databaseURL.slice(0, -1)
      : firebaseConfig.databaseURL

    const user = auth.currentUser
    const token = user ? await user.getIdToken() : null
    const url = token 
      ? `${baseUrl}/readings/${troughId}.json?orderBy=%22$key%22&limitToLast=5&auth=${token}`
      : `${baseUrl}/readings/${troughId}.json?orderBy=%22$key%22&limitToLast=5`

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[v0] Raw Firebase data for trough ${troughId}:`, data)

    if (data) {
      delete data["latest"]
      const keys = Object.keys(data)
      if (keys.length === 0) return null

      const latestKey = keys[keys.length - 1]
      const latestReading = data[latestKey]

      if (latestReading) {
        let timestampToUse = latestReading.timestamp;
        
        if (!timestampToUse || timestampToUse === "null") {
          let pushIdTime = null;
          
          const asDate = new Date(latestKey);
          if (!isNaN(asDate.getTime())) {
            pushIdTime = asDate.getTime();
          } else if (latestKey.startsWith('-') && latestKey.length === 20) {
            const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
            let time = 0;
            let valid = true;
            for (let i = 0; i < 8; i++) {
              const idx = PUSH_CHARS.indexOf(latestKey.charAt(i));
              if (idx === -1) { valid = false; break; }
              time = time * 64 + idx;
            }
            if (valid) pushIdTime = time;
          } else if (/^\d{10,}$/.test(latestKey)) {
            pushIdTime = Number(latestKey);
          }
          
          timestampToUse = pushIdTime ? new Date(pushIdTime).toISOString() : Date.now();
        }

        let validDate = new Date(timestampToUse)
        if (isNaN(validDate.getTime())) {
          validDate = new Date()
        }
        const timestamp = validDate.toISOString()

        let humidityValue = 0
        if (latestReading.humidity !== undefined && latestReading.humidity !== null) {
          humidityValue = Number.parseFloat(latestReading.humidity)
        } else if (latestReading.RH !== undefined && latestReading.RH !== null) {
          humidityValue = Number.parseFloat(latestReading.RH)
        } else if (latestReading.rh !== undefined && latestReading.rh !== null) {
          humidityValue = Number.parseFloat(latestReading.rh)
        }

        let louverStatus = "Unknown"
        if (latestReading.louverPercent !== undefined && latestReading.louverPercent !== null) {
          const percentage = Number.parseFloat(latestReading.louverPercent)
          louverStatus = `${percentage}% Open`
        } else if (latestReading.louverStatus) {
          louverStatus = latestReading.louverStatus
        }

        const depressionValue = (() => {
          const tryParse = (value: any) => {
            if (value === undefined || value === null) return null
            const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value)
            return Number.isNaN(parsed) ? null : parsed
          }

          const diffFValue = tryParse(latestReading.diffF)
          if (diffFValue !== null) return diffFValue

          const diffCValue = tryParse(latestReading.diffC)
          if (diffCValue !== null) return diffCValue

          const wbdCValue = tryParse(latestReading.WBD_C)
          if (wbdCValue !== null) return wbdCValue

          const wbdFValue = tryParse(latestReading.WBD_F)
          if (wbdFValue !== null) return wbdFValue

          const depressionFieldValue = tryParse(latestReading.depression)
          if (depressionFieldValue !== null) return depressionFieldValue

          return 0
        })()

        const reading = {
          timestamp,
          dryTemp:
            Number.parseFloat(latestReading.dryTempC) ||
            Number.parseFloat(latestReading.dryTempF) ||
            Number.parseFloat(latestReading.dryTemp) ||
            0,
          rh: humidityValue || 0,
          wetTemp:
            Number.parseFloat(latestReading.wetTempC) ||
            Number.parseFloat(latestReading.wetTempF) ||
            Number.parseFloat(latestReading.wetTemp) ||
            0,
          depression: depressionValue,
          louverStatus: louverStatus,
        }

        console.log("[v0] Parsed Firebase reading:", reading)
        return reading
      }
    }
    return null
  } catch (error) {
    if (isAbortError(error)) {
      console.error("[v0] Firebase fetch timeout - request took too long")
    } else {
      console.error("[v0] Firebase fetch error:", getErrorMessage(error))
    }
    return null
  }
}

const fetchAllFirebaseData = async (troughId: string): Promise<SensorReading[]> => {
  try {
    if (!isFirebaseConfigured()) {
      console.log("[v0] Firebase not configured for complete data fetch")
      return []
    }

    console.log(`[v0] Fetching ALL historical data from Firebase for trough ${troughId}...`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const user = auth.currentUser
    const token = user ? await user.getIdToken() : null

    const baseUrl = firebaseConfig.databaseURL.endsWith("/")
      ? firebaseConfig.databaseURL.slice(0, -1)
      : firebaseConfig.databaseURL

    let response: Response | null = null
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const url = token 
          ? `${baseUrl}/readings/${troughId}.json?auth=${token}`
          : `${baseUrl}/readings/${troughId}.json`

        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        if (response.ok) {
          break
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } catch (error) {
        retryCount++
        console.log(`[v0] Firebase fetch attempt ${retryCount} failed:`, getErrorMessage(error))

        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryCount * 2000))
        } else {
          throw error
        }
      }
    }

    clearTimeout(timeoutId)

    if (!response || !response.ok) {
      throw new Error(`HTTP error! status: ${response?.status ?? "unknown"}`)
    }

    const data = await response.json()

    if (data) {
      const allReadings: SensorReading[] = []

      function isReadingObject(obj: any): boolean {
        if (!obj || typeof obj !== "object") return false
        return (
          obj.dryTempC !== undefined ||
          obj.dryTempF !== undefined ||
          obj.dryTemp !== undefined ||
          obj.wetTempC !== undefined ||
          obj.wetTempF !== undefined ||
          obj.wetTemp !== undefined ||
          obj.RH !== undefined ||
          obj.rh !== undefined ||
          obj.humidity !== undefined ||
          obj.louverPercent !== undefined ||
          obj.depression !== undefined ||
          obj.louverStatus !== undefined
        )
      }

      function extractTimestampFromFirebaseKey(key: string): number | null {
        if (!key) return null;
        const asDate = new Date(key);
        if (!isNaN(asDate.getTime())) {
          return asDate.getTime();
        }
        if (/^\d{10,}$/.test(key)) return Number(key);
        if (key.startsWith('-') && key.length === 20) {
          const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
          let time = 0;
          for (let i = 0; i < 8; i++) {
            const index = PUSH_CHARS.indexOf(key.charAt(i));
            if (index === -1) return null;
            time = time * 64 + index;
          }
          return time;
        }
        return null;
      }

      function extractReadings(obj: any, parentKey: string = ""): void {
        if (!obj || typeof obj !== "object") return

        Object.keys(obj).forEach((key) => {
          if (key === "latest") return
          const value = obj[key]
          if (isReadingObject(value)) {
            processReading(value, key)
          } else if (value && typeof value === "object" && !Array.isArray(value)) {
            extractReadings(value, key)
          }
        })
      }

      function processReading(reading: any, fallbackKey: string): void {
        let timestamp = reading.timestamp;
        if (!timestamp || timestamp === "null") {
          const extractedTime = extractTimestampFromFirebaseKey(fallbackKey);
          if (extractedTime) {
            timestamp = new Date(extractedTime).toISOString();
          } else {
            return
          }
        }

        try {
          const dateObj = new Date(timestamp)
          if (isNaN(dateObj.getTime())) return
          timestamp = dateObj.toISOString()
        } catch (e) {
          return
        }

        let humidityValue = 0
        if (reading.humidity !== undefined && reading.humidity !== null) {
          humidityValue = Number.parseFloat(reading.humidity)
        } else if (reading.RH !== undefined && reading.RH !== null) {
          humidityValue = Number.parseFloat(reading.RH)
        } else if (reading.rh !== undefined && reading.rh !== null) {
          humidityValue = Number.parseFloat(reading.rh)
        }

        let louverStatus = "Unknown"
        if (reading.louverPercent !== undefined && reading.louverPercent !== null) {
          const percentage = Number.parseFloat(reading.louverPercent)
          louverStatus = `${percentage}% Open`
        } else if (reading.louverStatus) {
          louverStatus = reading.louverStatus
        }

        const depressionValue = (() => {
          const tryParse = (value: any) => {
            if (value === undefined || value === null) return null
            const parsed = typeof value === "string" ? parseFloat(value) : Number(value)
            return isNaN(parsed) ? null : parsed
          }

          const diffFValue = tryParse(reading.diffF)
          if (diffFValue !== null) return diffFValue
          const wbdCValue = tryParse(reading.WBD_C)
          if (wbdCValue !== null) return wbdCValue
          const wbdFValue = tryParse(reading.WBD_F)
          if (wbdFValue !== null) return wbdFValue
          const deprValue = tryParse(reading.depression)
          if (deprValue !== null) return deprValue
          return 0
        })()

        allReadings.push({
          timestamp,
          dryTemp:
            Number.parseFloat(reading.dryTempF) ||
            Number.parseFloat(reading.dryTempC) ||
            Number.parseFloat(reading.dryTemp) ||
            0,
          rh: humidityValue || 0,
          wetTemp:
            Number.parseFloat(reading.wetTempF) ||
            Number.parseFloat(reading.wetTempC) ||
            Number.parseFloat(reading.wetTemp) ||
            0,
          depression: depressionValue,
          louverStatus: louverStatus,
        })
      }

      extractReadings(data)
      allReadings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return allReadings
    }

    return []
  } catch (error) {
    console.error("[v0] Error fetching complete Firebase data:", getErrorMessage(error))
    return []
  }
}

export default function TroughDetailPage() {
  const router = useRouter()
  const params = useParams()
  const troughId = (params?.id as string) || "trough_1"
  
  // Format trough ID to human readable Name: trough_1 -> Trough 1
  const defaultTroughName = troughId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const [troughName, setTroughName] = useState(defaultTroughName)
  const [authLoading, setAuthLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([])
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)
  const [dataSource, setDataSource] = useState<"mock" | "firebase">("firebase")
  const [firebaseConnected, setFirebaseConnected] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"monitor" | "idfan">("monitor")

  // ID Fan state
  const [idFanStatus, setIdFanStatus] = useState<"running" | "stopped" | "fault">("stopped")
  const [idFanSpeed, setIdFanSpeed] = useState<number>(60)
  const [idFanMode, setIdFanMode] = useState<"auto" | "manual">("auto")
  const [idFanInletTemp, setIdFanInletTemp] = useState<number>(0)
  const [idFanOutletTemp, setIdFanOutletTemp] = useState<number>(0)
  const [idFanStaticPressure, setIdFanStaticPressure] = useState<number>(0)
  const [idFanExhaustHumidity, setIdFanExhaustHumidity] = useState<number>(0)
  const [idFanVfdFreq, setIdFanVfdFreq] = useState<number>(40)

  // Fetch trough details from database to get the custom name if configured
  useEffect(() => {
    const fetchTroughDetails = async () => {
      try {
        const factoryId = localStorage.getItem("factoryId")
        if (factoryId) {
          const troughRef = ref(database, `factories/${factoryId}/troughs/${troughId}`)
          const snapshot = await get(troughRef)
          if (snapshot.exists()) {
            const data = snapshot.val()
            if (data.name) {
              setTroughName(data.name)
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch trough details:", err)
      }
    }
    fetchTroughDetails()
  }, [troughId])

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("userRole")) {
      setAuthLoading(false);
    }

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
        
        if (userData.needsPasswordChange === true || userData.needsPasswordChange === "true") {
          router.push("/change-password");
          return;
        }

        setUserProfile(userData);
        setAuthLoading(false);
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateSensorData = useCallback(async () => {
    console.log(`[v0] Generating new sensor reading for ${troughId}...`)
    setIsUpdating(true)
    const now = new Date()
    let newReading: SensorReading

    if (dataSource === "firebase") {
      const firebaseReading = await fetchFirebaseData(troughId)
      if (firebaseReading) {
        const firebaseTimestamp = new Date(firebaseReading.timestamp)
        const dataAge = Math.abs(Date.now() - firebaseTimestamp.getTime())
        const isStale = dataAge > 5 * 60 * 1000

        if (isStale) {
          console.log("[v0] Firebase data is too stale, using zero reading")
          newReading = createZeroReading()
          setFirebaseConnected(false)
        } else {
          const isDuplicate =
            currentReading &&
            currentReading.timestamp === firebaseReading.timestamp &&
            currentReading.dryTemp === firebaseReading.dryTemp &&
            currentReading.rh === firebaseReading.rh

          if (isDuplicate) {
            console.log("[v0] WARNING: Received duplicate data from Firebase")
            setIsUpdating(false)
            return
          }

          newReading = firebaseReading
          setFirebaseConnected(true)
        }
      } else {
        setFirebaseConnected(false)
        newReading = createZeroReading()
      }
    } else {
      newReading = {
        timestamp: now.toISOString(),
        dryTemp: 76 + Math.random() * 8,
        rh: 58 + Math.random() * 12,
        wetTemp: 70 + Math.random() * 6,
        depression: 5 + Math.random() * 4,
        louverStatus: Math.random() > 0.4 ? "Open" : "Closed",
      }
    }

    setSensorData((prev) => {
      const newData = [...prev.slice(-19), newReading]
      newData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return newData
    })
    setHistoricalData((prev) => {
      const newHistorical = [...prev, newReading]
      newHistorical.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      return newHistorical
    })
    setCurrentReading(newReading)
    setLastUpdate(now)
    setUpdateCount((prev) => prev + 1)

    setTimeout(() => setIsUpdating(false), 500)
  }, [dataSource, currentReading, troughId])

  useEffect(() => {
    const initializeData = async () => {
      if (sensorData.length > 0) {
        setCurrentReading(sensorData[sensorData.length - 1])
      }

      try {
        const testData = await fetchFirebaseData(troughId)
        const connected = testData !== null
        setFirebaseConnected(connected)

        if (testData && dataSource === "firebase") {
          const dataAge = Math.abs(Date.now() - new Date(testData.timestamp).getTime())
          if (dataAge > 5 * 60 * 1000) {
            const zeroData = createZeroReading()
            setCurrentReading(zeroData)
            setSensorData((prev) => [...prev.slice(-19), zeroData])
            setHistoricalData((prev) => [...prev, zeroData])
            setFirebaseConnected(false)
          } else {
            setCurrentReading(testData)
            setSensorData((prev) => [...prev.slice(-19), testData])
            setHistoricalData((prev) => [...prev, testData])
          }
        } else {
          setFirebaseConnected(false)
        }
      } catch (error) {
        setFirebaseConnected(false)
      }
    }

    initializeData()

    const updateInterval = 30000
    const interval = setInterval(updateSensorData, updateInterval)

    return () => {
      clearInterval(interval)
    }
  }, [troughId])

  useEffect(() => {
    const handleDataSourceChange = async () => {
      if (dataSource === "firebase") {
        const testData = await fetchFirebaseData(troughId)
        setFirebaseConnected(testData !== null)
        if (testData) {
          const dataAge = Math.abs(Date.now() - new Date(testData.timestamp).getTime())
          if (dataAge > 5 * 60 * 1000) {
            const zeroData = createZeroReading()
            setCurrentReading(zeroData)
            setSensorData((prev) => [...prev.slice(-19), zeroData])
            setHistoricalData((prev) => [...prev, zeroData])
            setFirebaseConnected(false)
          } else {
            setCurrentReading(testData)
            setSensorData((prev) => [...prev.slice(-19), testData])
            setHistoricalData((prev) => [...prev, testData])
          }
        }
      }
    }

    handleDataSourceChange()
  }, [dataSource, troughId])

  const toggleDataSource = async () => {
    const newSource = dataSource === "mock" ? "firebase" : "mock"
    setDataSource(newSource)

    if (newSource === "firebase") {
      const testData = await fetchFirebaseData(troughId)
      setFirebaseConnected(testData !== null)
    }
  }

  const downloadCSV = async () => {
    setDownloadStatus("Preparing download...")
    let completeData: SensorReading[] = []
    let dataSourceInfo = ""

    const allFirebaseData = await fetchAllFirebaseData(troughId)

    if (allFirebaseData.length > 0) {
      completeData = allFirebaseData
      dataSourceInfo = `Firebase Database (${completeData.length} total readings)`
    } else {
      completeData = historicalData
      dataSourceInfo = `Session Data (${completeData.length} readings)`
    }

    setDownloadStatus("Processing data...")
    const filteredData = completeData

    const headers = [
      `# Tea Factory Louver Control System - Trough: ${troughName} (${troughId})`,
      `# Export Date: ${new Date().toLocaleString()}`,
      `# Total Historical Readings: ${filteredData.length}`,
      "",
      "Timestamp (Local Time),Dry Temperature (°F),Relative Humidity (%),Wet Temperature (°F),Depression (°F),Louver Status",
    ]

    const csvContent = [
      ...headers,
      ...filteredData.map((row) =>
        [
          `"${new Date(row.timestamp).toLocaleString()}"`,
          row.dryTemp.toFixed(1),
          row.rh.toFixed(1),
          row.wetTemp.toFixed(1),
          row.depression.toFixed(1),
          row.louverStatus,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-")
    const filename = `${troughId}-complete-history-${dateStr}-${timeStr}.csv`
    a.download = filename

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    setDownloadStatus(`✅ Downloaded: ${filename}`)
    setTimeout(() => setDownloadStatus(""), 5000)
  }

  const downloadLast24HoursCSV = async () => {
    setDownloadStatus("Preparing last 24 hours download...")
    let completeData: SensorReading[] = []
    let dataSourceInfo = ""

    const allFirebaseData = await fetchAllFirebaseData(troughId)
    if (allFirebaseData.length > 0) {
      completeData = allFirebaseData
      dataSourceInfo = `Firebase Database`
    } else {
      completeData = historicalData
      dataSourceInfo = `Session Data`
    }

    setDownloadStatus("Filtering data...")
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const filteredData = completeData.filter((reading) => {
      const readingTime = new Date(reading.timestamp)
      return readingTime >= twentyFourHoursAgo
    })

    const headers = [
      `# Tea Factory Louver Control System - Trough: ${troughName} (${troughId}) - Last 24 Hours`,
      `# Export Date: ${new Date().toLocaleString()}`,
      `# Data Points: ${filteredData.length} readings`,
      "",
      "Timestamp (Local Time),Dry Temperature (°F),Relative Humidity (%),Wet Temperature (°F),Depression (°F),Louver Status",
    ]

    const csvContent = [
      ...headers,
      ...filteredData.map((row) =>
        [
          `"${new Date(row.timestamp).toLocaleString()}"`,
          row.dryTemp.toFixed(1),
          row.rh.toFixed(1),
          row.wetTemp.toFixed(1),
          row.depression.toFixed(1),
          row.louverStatus,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const filename = `${troughId}-last-24h-${now.toISOString().split("T")[0]}.csv`
    a.download = filename

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    setDownloadStatus(`✅ Downloaded: ${filename}`)
    setTimeout(() => setDownloadStatus(""), 5000)
  }

  const getProcessingStatus = () => {
    if (!currentReading) return { status: "Unknown", color: "gray" }
    const { dryTemp, rh } = currentReading
    if (dryTemp >= 75 && dryTemp <= 85 && rh >= 60 && rh <= 70) {
      return { status: "Optimal", color: "green" }
    } else if (dryTemp >= 70 && dryTemp <= 90 && rh >= 55 && rh <= 75) {
      return { status: "Acceptable", color: "yellow" }
    } else {
      return { status: "Monitoring", color: "blue" }
    }
  }

  const calculateOptimalLouverPercentage = (depression: number) => {
    if (depression < 4) return 100
    if (depression > 8) return 0
    const percentage = 100 - ((depression - 4) / 4) * 100
    return Math.max(0, Math.min(100, Math.round(percentage * 10) / 10))
  }

  const getCurrentLouverPercentage = () => {
    if (!currentReading?.louverStatus) return 0
    const match = currentReading.louverStatus.match(/(\d+)%/)
    if (match) return Number.parseInt(match[1])
    if (currentReading.louverStatus.toLowerCase().includes("open")) return 100
    if (currentReading.louverStatus.toLowerCase().includes("closed")) return 0
    if (currentReading.louverStatus.toLowerCase().includes("half")) return 50
    return 0
  }

  const getDepressionStatus = (depression: number) => {
    if (depression < 4) {
      return { status: "Too Humid - Louver FULL ON", color: "blue", recommendation: "Turn on louver fully (100%)" }
    } else if (depression > 8) {
      return { status: "Too Dry - Louver OFF", color: "red", recommendation: "Turn off louver (0%)" }
    } else {
      const optimalPercentage = calculateOptimalLouverPercentage(depression)
      return {
        status: "Optimal Range",
        color: "green",
        recommendation: `Maintain louver at ${optimalPercentage}%`,
      }
    }
  }

  const handleManualRefresh = async () => {
    await updateSensorData()
  }

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("companyId");
      localStorage.removeItem("factoryId");
    }
    await signOut(auth);
    router.push("/login");
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#064e3b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#10b981", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ID Fan derived values
  const idFanRpm = Math.round(idFanSpeed * 14.5)
  const idFanStatusColor = idFanStatus === "running" ? "#16a34a" : idFanStatus === "fault" ? "#dc2626" : "#6b7280"
  const idFanStatusLabel = idFanStatus === "running" ? "Running" : idFanStatus === "fault" ? "Fault" : "Stopped"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 p-2 sm:p-4 lg:p-6 xl:p-8 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-10 text-2xl">🍃</div>
        <div className="absolute top-20 right-20 text-xl">🌿</div>
        <div className="absolute top-40 left-1/4 text-lg">🌱</div>
        <div className="absolute bottom-40 left-20 text-xl">🌿</div>
        <div className="absolute bottom-60 right-10 text-lg">🌱</div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Top white banner layout styled premium like Second Image */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/dashboard")}
              className="h-10 w-10 p-0 border border-gray-200 rounded-xl flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-blue-900 tracking-wider font-sans">SAN<span className="text-amber-500">O</span>TA</span>
            </div>
          </div>
          
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-teal-800 tracking-tight">
              {troughName} Louver Control
            </h1>
            <div className="inline-block mt-1 bg-teal-50 border border-teal-100 px-4 py-1 rounded-full">
              <span className="text-[10px] sm:text-xs font-bold text-teal-600 uppercase tracking-widest">
                Every Leaf Deserves Care
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {userProfile && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Logged in as</p>
                <p className="text-xs font-bold text-gray-700">{userProfile.email || userProfile.name}</p>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 border border-red-100 hover:bg-red-50 hover:text-red-600 text-gray-700 px-4 py-2 h-10 rounded-xl font-bold text-sm"
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border p-1.5 mb-6 flex gap-1">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === "monitor"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-500 hover:text-teal-700 hover:bg-teal-50"
            }`}
          >
            <Activity className="h-4 w-4" />
            Trough Monitor
          </button>
          <button
            onClick={() => setActiveTab("idfan")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === "idfan"
                ? "bg-slate-600 text-white shadow-sm"
                : "text-gray-500 hover:text-slate-700 hover:bg-gray-50"
            }`}
          >
            <Fan className="h-4 w-4" />
            ID Fan
          </button>
        </div>

        {/* ============================================================ */}
        {/* ID FAN TAB */}
        {/* ============================================================ */}
        {activeTab === "idfan" && (
          <div className="space-y-5">

            {/* Status Banner */}
            <div
              className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
              style={{
                background: idFanStatus === "running" ? "#f0fdf4" : idFanStatus === "fault" ? "#fef2f2" : "#f8fafc",
                borderColor: idFanStatus === "running" ? "#86efac" : idFanStatus === "fault" ? "#fca5a5" : "#e2e8f0",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: idFanStatus === "running" ? "#dcfce7" : idFanStatus === "fault" ? "#fee2e2" : "#f1f5f9" }}>
                  <Fan className="h-7 w-7" style={{ color: idFanStatusColor, animation: idFanStatus === "running" ? `spin ${Math.max(0.6, 3 - idFanSpeed / 50)}s linear infinite` : "none" }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">ID Fan — {troughName}</p>
                  <h2 className="text-xl font-extrabold" style={{ color: idFanStatusColor }}>{idFanStatusLabel}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{idFanSpeed}% speed · {idFanRpm} RPM · {idFanVfdFreq} Hz VFD</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setIdFanStatus("running")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${idFanStatus === "running" ? "bg-green-600 border-green-600 text-white shadow" : "bg-white border-green-300 text-green-700 hover:bg-green-50"}`}>
                  <CheckCircle className="h-4 w-4" /> Start
                </button>
                <button onClick={() => setIdFanStatus("stopped")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${idFanStatus === "stopped" ? "bg-gray-600 border-gray-600 text-white shadow" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Stop
                </button>
                <button onClick={() => setIdFanStatus("fault")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${idFanStatus === "fault" ? "bg-red-500 border-red-500 text-white shadow" : "bg-white border-red-200 text-red-500 hover:bg-red-50"}`}>
                  <AlertTriangle className="h-4 w-4" /> Fault
                </button>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: "Fan Speed",       value: `${idFanSpeed}%`,                    sub: `${idFanRpm} RPM`,    icon: <Gauge      className="h-4 w-4 text-indigo-500" />, bg: "bg-indigo-50", val: "text-indigo-600" },
                { label: "VFD Frequency",   value: `${idFanVfdFreq} Hz`,                sub: "Drive freq",          icon: <Zap        className="h-4 w-4 text-amber-500"  />, bg: "bg-amber-50",  val: "text-amber-600"  },
                { label: "Static Pressure", value: `${idFanStaticPressure.toFixed(1)} Pa`, sub: "Inlet → Outlet",  icon: <Wind       className="h-4 w-4 text-teal-500"   />, bg: "bg-teal-50",   val: "text-teal-600"   },
                { label: "Inlet Temp",      value: `${idFanInletTemp.toFixed(1)}°F`,     sub: "Chamber side",       icon: <Thermometer className="h-4 w-4 text-rose-500"   />, bg: "bg-rose-50",   val: "text-rose-600"   },
                { label: "Outlet Temp",     value: `${idFanOutletTemp.toFixed(1)}°F`,    sub: "Exhaust side",       icon: <Thermometer className="h-4 w-4 text-orange-500" />, bg: "bg-orange-50", val: "text-orange-600" },
                { label: "Exhaust RH",      value: `${idFanExhaustHumidity.toFixed(1)}%`, sub: "Humidity out",       icon: <Droplets   className="h-4 w-4 text-sky-500"    />, bg: "bg-sky-50",    val: "text-sky-600"    },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{card.label}</span>
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>{card.icon}</div>
                  </div>
                  <div className={`text-2xl font-extrabold leading-tight ${card.val}`}>{card.value}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Controls + Airflow side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Fan Controls */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <h3 className="text-sm font-extrabold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-4 w-4 text-teal-600" /> Fan Controls
                </h3>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operating Mode</p>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl">
                    <button onClick={() => setIdFanMode("auto")}
                      className={`py-2.5 rounded-lg font-bold text-sm transition-all ${idFanMode === "auto" ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:text-teal-700"}`}>
                      🔄 Auto
                    </button>
                    <button onClick={() => setIdFanMode("manual")}
                      className={`py-2.5 rounded-lg font-bold text-sm transition-all ${idFanMode === "manual" ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:text-teal-700"}`}>
                      🎛️ Manual
                    </button>
                  </div>
                  {idFanMode === "auto" && (
                    <p className="text-[11px] text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 font-medium">
                      ✅ Speed is auto-controlled by chamber conditions.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fan Speed</p>
                    <span className="text-base font-extrabold text-teal-700">{idFanSpeed}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={idFanSpeed} disabled={idFanMode === "auto"}
                    onChange={(e) => { const v = Number(e.target.value); setIdFanSpeed(v); setIdFanVfdFreq(Math.round(v * 0.5)) }}
                    className="w-full h-2.5 rounded-full accent-teal-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>0% Off</span><span>50%</span><span>100% Full</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">VFD Frequency</p>
                    <span className="text-base font-extrabold text-teal-700">{idFanVfdFreq} Hz</span>
                  </div>
                  <input type="range" min={0} max={50} step={1} value={idFanVfdFreq} disabled={idFanMode === "auto"}
                    onChange={(e) => { const v = Number(e.target.value); setIdFanVfdFreq(v); setIdFanSpeed(Math.round(v * 2)) }}
                    className="w-full h-2.5 rounded-full accent-teal-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>0 Hz</span><span>25 Hz</span><span>50 Hz</span>
                  </div>
                </div>
              </div>

              {/* Airflow Path */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-extrabold text-gray-600 uppercase tracking-wider flex items-center gap-2 mb-5">
                  <Wind className="h-4 w-4 text-teal-600" /> Airflow Path
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Fresh Air Inlet", icon: "🌬️", desc: "Outside air enters" },
                    { label: "Louvers", icon: "⚙️", desc: "Flow control dampers" },
                    { label: "Tea Bed", icon: "🍃", desc: "Withering chamber" },
                    { label: "ID Fan", icon: "💨", desc: "Induced draft exhaust", highlight: true },
                    { label: "Exhaust", icon: "☁️", desc: "Moist air discharged" },
                  ].map((item, i, arr) => (
                    <div key={item.label}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${item.highlight ? "border-teal-200 bg-teal-50" : "border-gray-100 bg-gray-50"}`}>
                        <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${item.highlight ? "text-teal-800" : "text-gray-700"}`}>{item.label}</p>
                          <p className="text-[11px] text-gray-400">{item.desc}</p>
                        </div>
                        {item.highlight && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: idFanStatusColor }}>{idFanStatusLabel}</span>
                        )}
                      </div>
                      {i < arr.length - 1 && <div className="flex justify-start pl-5"><div className="w-0.5 h-3 bg-gray-200" /></div>}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-4 text-center">
                  ID Fan creates negative pressure, pulling air through the tea bed and out.
                </p>
              </div>
            </div>

            {/* Stage Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { stage: "Withering", icon: "🌱", desc: "Removes moisture from green leaf evenly across the trough." },
                { stage: "Drying / Firing", icon: "🔥", desc: "Exhausts humid hot air to maintain dryer efficiency." },
                { stage: "Fermentation", icon: "♻️", desc: "Controls fresh air exchange and temperature balance." },
              ].map((item) => (
                <div key={item.stage} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-extrabold text-teal-700 uppercase tracking-wider mb-1">{item.stage}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}


        {/* ============================================================ */}
        {/* TROUGH MONITOR TAB (existing content) */}
        {/* ============================================================ */}
        {activeTab === "monitor" && (
          <div>
        {/* Status badges and controls section */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className={`text-sm px-3 py-2 rounded-xl ${getProcessingStatus().color === "green"
                ? "border-green-500 text-green-700 bg-green-50"
                : getProcessingStatus().color === "yellow"
                  ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                  : "border-blue-500 text-blue-700 bg-blue-50"
                }`}
            >
              {getProcessingStatus().status}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-2 border-emerald-500 text-emerald-700 bg-emerald-50 rounded-xl">
              {`Depression: ${currentReading?.depression?.toFixed(1) || "0.0"}°F`}
            </Badge>

            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <span className="text-sm text-green-700 font-medium">Louver:</span>
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={
                        getCurrentLouverPercentage() === 0
                          ? "#dc2626"
                          : getCurrentLouverPercentage() === 100
                            ? "#16a34a"
                            : "#f59e0b"
                      }
                      strokeWidth="3"
                      strokeDasharray={`${getCurrentLouverPercentage()}, 100`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-green-700">{`${getCurrentLouverPercentage()}%`}</span>
                  </div>
                </div>
                <span className="text-xs text-green-600 font-medium">Current Opening</span>
              </div>
            </div>

            {currentReading?.depression !== undefined && (
              <Badge
                variant="outline"
                className={`text-sm px-3 py-2 rounded-xl ${getDepressionStatus(currentReading.depression).color === "red"
                  ? "border-red-500 text-red-700 bg-red-50"
                  : getDepressionStatus(currentReading.depression).color === "blue"
                    ? "border-blue-500 text-blue-700 bg-blue-50"
                    : "border-green-500 text-green-700 bg-green-50"
                  }`}
              >
                {getDepressionStatus(currentReading.depression).status}
              </Badge>
            )}

            {isUpdating && (
              <Badge
                variant="outline"
                className="text-sm px-3 py-2 border-blue-500 text-blue-700 bg-blue-50 animate-pulse rounded-xl"
              >
                Updating...
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-2 border-gray-500 text-gray-700 bg-gray-50 rounded-xl">
                Updates: {updateCount}
              </Badge>
              <Badge
                variant="outline"
                className={`text-sm px-3 py-2 rounded-xl ${dataSource === "firebase" ? "border-orange-500 text-orange-700 bg-orange-50" : "border-purple-500 text-purple-700 bg-purple-50"}`}
              >
                {dataSource === "firebase" ? "Firebase (30s)" : "Mock (30s)"}
              </Badge>
              {dataSource === "firebase" && (
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-2 rounded-xl ${firebaseConnected ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50"}`}
                >
                  {firebaseConnected ? "Connected" : "Disconnected"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="text-sm font-medium" suppressHydrationWarning>
                  {mounted ? `${lastUpdate.toLocaleTimeString()}.${lastUpdate.getMilliseconds().toString().padStart(3, "0")}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleDataSource} className="h-9 w-9 p-0 bg-transparent rounded-xl">
                  {dataSource === "firebase" ? <Database className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isUpdating}
                  className="h-9 w-9 p-0 bg-transparent rounded-xl"
                >
                  <Activity className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid Cards matching second image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl transition-all duration-350 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
              <CardTitle className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
                Dry Temperature
              </CardTitle>
              <div className="p-2 bg-red-50 rounded-xl">
                <Thermometer className="h-5 w-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-4xl font-extrabold text-red-600 tracking-tight">{`${currentReading?.dryTemp.toFixed(1) || "--"}°F`}</div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">Withering chamber ambient</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl transition-all duration-350 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
              <CardTitle className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
                Wet Temperature
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-xl">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-4xl font-extrabold text-blue-600 tracking-tight">{`${currentReading?.wetTemp.toFixed(1) || "--"}°F`}</div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">Moisture content indicator</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl transition-all duration-350 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
              <CardTitle className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
                Relative Humidity
              </CardTitle>
              <div className="p-2 bg-teal-50 rounded-xl">
                <Wind className="h-5 w-5 text-teal-500" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-4xl font-extrabold text-teal-600 tracking-tight">{`${currentReading?.rh.toFixed(1) || "--"}%`}</div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">Critical for tea quality</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl transition-all duration-350 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
              <CardTitle className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
                Depression
              </CardTitle>
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                {`${currentReading?.depression?.toFixed(1) || "0.0"}°F`}
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">
                {currentReading?.depression == null
                  ? "Waiting for data..."
                  : currentReading.depression < 4
                    ? "Too humid - Open fully"
                    : currentReading.depression > 8
                      ? "Too dry - Close fully"
                      : "Optimal drying range"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl transition-all duration-350 hover:shadow-md sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
              <CardTitle className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
                Louver Control
              </CardTitle>
              <div className="p-2 bg-lime-50 rounded-xl">
                <Wind className="h-5 w-5 text-lime-600" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={currentReading?.louverStatus?.includes("Open") ? "default" : "secondary"}
                    className={`text-sm rounded-xl font-bold uppercase ${currentReading?.louverStatus?.includes("Open") ? "bg-green-600" : "bg-gray-500"}`}
                  >
                    {`${currentReading?.louverStatus || "Unknown"}`}
                  </Badge>
                </div>
                <div className="text-3xl font-extrabold text-teal-800 tracking-tight">{`${getCurrentLouverPercentage()}% Open`}</div>
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">
                Position control
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="xl:col-span-2">
            <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
              <TemperatureChart data={sensorData} />
            </div>
          </div>
          <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
            <HumidityChart data={sensorData} />
          </div>
          <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
            <LouverStatusChart data={sensorData} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-6">Last 24 Hours Overview</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="xl:col-span-2">
              <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
                <TemperatureChart24h data={sensorData} />
              </div>
            </div>
            <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
              <HumidityChart24h data={sensorData} />
            </div>
            <div className="w-full overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-100">
              <LouverStatusChart24h data={sensorData} />
            </div>
          </div>
        </div>

        {/* Data Export */}
        <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-800">
              <Download className="h-5 w-5 text-teal-600" />
              <span>Tea Processing Data Export</span>
            </CardTitle>
            <CardDescription className="text-sm text-gray-400 font-medium">
              Exports readings from Firebase database. Choose between last 24 hours or all historical data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={downloadLast24HoursCSV}
                  disabled={!!downloadStatus && !downloadStatus.includes("✅")}
                  className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl w-full sm:flex-1 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {downloadStatus && !downloadStatus.includes("✅") && downloadStatus.includes("24")
                      ? downloadStatus
                      : "Download Last 24 Hours (CSV)"}
                  </span>
                </Button>

                <Button
                  onClick={downloadCSV}
                  disabled={!!downloadStatus && !downloadStatus.includes("✅")}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl w-full sm:flex-1 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {downloadStatus && !downloadStatus.includes("✅") && !downloadStatus.includes("24")
                      ? downloadStatus
                      : "Download All Historical Data (CSV)"}
                  </span>
                </Button>
              </div>

              {downloadStatus && (
                <div
                  className={`p-4 rounded-xl text-sm font-semibold ${downloadStatus.includes("✅")
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-teal-50 border border-teal-200 text-teal-800"
                    }`}
                >
                  {downloadStatus.includes("✅") ? (
                    <div>
                      <p className="font-bold">{downloadStatus}</p>
                      <p className="text-xs mt-1 font-medium opacity-75">
                        📱 On mobile: Check your Downloads folder or browser notifications
                      </p>
                    </div>
                  ) : (
                    <p>{downloadStatus}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        )}
      </div>
    </div>
  )
}
