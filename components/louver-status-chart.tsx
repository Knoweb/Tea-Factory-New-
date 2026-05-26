"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Activity, Wind, Droplets, Power } from "lucide-react"

interface SensorReading {
  timestamp: string
  louverStatus: string
  depression: number
}

interface LouverStatusChartProps {
  data: SensorReading[]
}

export function LouverStatusChart({ data }: LouverStatusChartProps) {
  const formatTime = (timestamp: string) => {
    // If timestamp is already formatted (contains comma), extract time portion
    if (timestamp.includes(",")) {
      const timePart = timestamp.split(", ")[1]
      if (timePart) {
        return timePart // Return full time like "1:20:17 PM"
      }
    }

    // Fallback to original parsing for ISO timestamps
    try {
      return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit", // Added seconds for exact time
      })
    } catch (error) {
      return timestamp // Return original if parsing fails
    }
  }

  const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const chartData = sortedData.map((reading, index) => ({
    time: formatTime(reading.timestamp),
    status: reading.louverStatus === "Open" ? 1 : 0,
    depression: reading.depression,
    statusLabel: reading.louverStatus,
    index: index,
  }))

  // Calculate louver operation statistics
  const totalReadings = sortedData.length
  const openReadings = sortedData.filter((r) => r.louverStatus === "Open").length
  const closedReadings = totalReadings - openReadings
  const openPercentage = ((openReadings / totalReadings) * 100).toFixed(1)
  const avgDepression = (sortedData.reduce((sum, r) => sum + r.depression, 0) / totalReadings).toFixed(1)

  const statusSegments: { start: number; end: number; status: string; duration: number }[] = []
  let currentStatus: string | null = null
  let segmentStart = 0

  chartData.forEach((point, index) => {
    if (currentStatus !== point.statusLabel) {
      if (currentStatus !== null) {
        statusSegments.push({
          status: currentStatus,
          start: segmentStart,
          end: index - 1,
          duration: index - segmentStart,
        })
      }
      currentStatus = point.statusLabel
      segmentStart = index
    }

    if (index === chartData.length - 1) {
      statusSegments.push({
        status: currentStatus,
        start: segmentStart,
        end: index,
        duration: index - segmentStart + 1,
      })
    }
  })

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Power className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          <CardTitle className="text-base sm:text-lg">Tea Factory Louver Operation Timeline</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Real-time airflow control system status and operation history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Operation Timeline</h4>
          <div className="relative h-12 sm:h-16 bg-gray-100 rounded-lg overflow-hidden">
            {statusSegments.map((segment, index) => (
              <div
                key={index}
                className={`absolute top-0 h-full flex items-center justify-center text-white font-medium text-xs sm:text-sm ${
                  segment.status === "Open" ? "bg-green-500" : "bg-red-500"
                }`}
                style={{
                  left: `${(segment.start / (chartData.length - 1)) * 100}%`,
                  width: `${(segment.duration / chartData.length) * 100}%`,
                }}
              >
                {segment.status}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{chartData[0]?.time}</span>
            <span>{chartData[chartData.length - 1]?.time}</span>
          </div>
        </div>

        <ChartContainer
          config={{
            status: {
              label: "Louver Status",
              color: "#3b82f6",
            },
          }}
          className="h-[180px] xs:h-[200px] sm:h-[250px] md:h-[300px] lg:h-[350px] xl:h-[400px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#374151" // Made axis stroke darker for better visibility
                fontSize={8}
                tickLine={true} // Enabled tick lines for better axis visibility
                axisLine={true} // Ensure axis line is visible
                angle={-45}
                textAnchor="end"
                height={60} // Increased height to accommodate longer time labels with seconds
                interval="preserveStartEnd"
                className="text-[8px] xs:text-[9px] sm:text-[10px]"
              />
              <YAxis
                stroke="#374151" // Made axis stroke darker for better visibility
                fontSize={8}
                tickLine={true} // Enabled tick lines for better axis visibility
                axisLine={true} // Ensure axis line is visible
                width={45}
                domain={[-0.1, 1.1]}
                tickFormatter={(value) => (value === 1 ? "OPEN" : value === 0 ? "CLOSED" : "")}
                ticks={[0, 1]}
              />
              <ReferenceLine y={0.5} stroke="#9ca3af" strokeDasharray="2 2" />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 sm:p-3 border rounded-lg shadow-lg text-xs sm:text-sm">
                        <p className="font-medium">{`Time: ${label}`}</p>
                        <p className={`font-bold ${data.status === 1 ? "text-green-600" : "text-red-600"}`}>
                          {`Status: ${data.statusLabel}`}
                        </p>
                        <p className="text-purple-600">{`Depression: ${data.depression.toFixed(1)}°F`}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="stepAfter"
                dataKey="status"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 1, r: 3 }}
                activeDot={{ r: 5, fill: "#1d4ed8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                  sortedData[sortedData.length - 1]?.louverStatus === "Open"
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="font-medium text-gray-800 text-sm sm:text-base">Current Status:</span>
              <span
                className={`font-bold text-base sm:text-lg ${
                  sortedData[sortedData.length - 1]?.louverStatus === "Open" ? "text-green-600" : "text-red-600"
                }`}
              >
                {sortedData[sortedData.length - 1]?.louverStatus || "Unknown"}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Last Update:{" "}
              {sortedData[sortedData.length - 1] ? formatTime(sortedData[sortedData.length - 1].timestamp) : "N/A"}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <Wind className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 mx-auto mb-1 sm:mb-2" />
            <div className="text-lg sm:text-2xl font-bold text-green-700">{openPercentage}%</div>
            <div className="text-xs sm:text-sm text-green-600">Open Time</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
            <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 mx-auto mb-1 sm:mb-2" />
            <div className="text-lg sm:text-2xl font-bold text-red-700">
              {(100 - Number.parseFloat(openPercentage)).toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-red-600">Closed Time</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Droplets className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
            <div className="text-lg sm:text-2xl font-bold text-blue-700">{avgDepression}°F</div>
            <div className="text-xs sm:text-sm text-blue-600">Avg Depression</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
            <div className="text-lg sm:text-2xl font-bold text-amber-700">{totalReadings}</div>
            <div className="text-xs sm:text-sm text-amber-600">Total Readings</div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Tea Processing Guidelines:</h4>
          <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
            <li>
              • <strong>Withering:</strong> Louvers open for increased airflow (60-70% RH)
            </li>
            <li>
              • <strong>Fermentation:</strong> Controlled airflow to maintain temperature
            </li>
            <li>
              • <strong>Drying:</strong> Louvers adjust based on depression readings
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}


