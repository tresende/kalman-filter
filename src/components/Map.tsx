'use client'
import { useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

class KalmanFilter {
  R: number
  Q: number
  A: number
  B: number
  C: number
  cov: number
  x: number

  constructor({ R = 0.01, Q = 3 } = {}) {
    this.R = R // Noise power desirable
    this.Q = Q // Estimated process variance
    this.A = 1 // State vector
    this.B = 0
    this.C = 1 // Measurement vector
    this.cov = NaN // Covariance
    this.x = NaN // Estimated signal
  }

  filter(z: number): number {
    if (isNaN(this.x)) {
      this.x = z
      this.cov = 1
    } else {
      const predX = this.A * this.x
      const predCov = this.A * this.cov * this.A + this.R
      const K = (predCov * this.C) / (this.C * predCov * this.C + this.Q)
      this.x = predX + K * (z - this.C * predX)
      this.cov = predCov - K * this.C * predCov
    }
    return this.x
  }
}

const containerStyle = {
  width: '100%',
  height: '80vh'
}

const initialPosition = { lat: -19.9208, lng: -43.9378 } // Start in BH

function Map() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
  })

  const [originalTelemetryData, setOriginalTelemetryData] = useState<{ lat: number; lng: number; timestamp: number }[]>(
    [initialPosition]
  )
  const [R, setR] = useState<number>(0.01)
  const [Q, setQ] = useState<number>(3)
  const [useKalmanFilter, setUseKalmanFilter] = useState<boolean>(true)
  const [filteredPath, setFilteredPath] = useState<{ lat: number; lng: number }[]>([initialPosition])
  const [markers, setMarkers] = useState<{ lat: number; lng: number }[]>([initialPosition])
  const [inputValue, setInputValue] = useState<string>('')

  const kalmanFiltersRef = useRef<{ latFilter: KalmanFilter; lngFilter: KalmanFilter }>({
    latFilter: new KalmanFilter({ R, Q }),
    lngFilter: new KalmanFilter({ R, Q })
  })

  useEffect(() => {
    if (isLoaded) {
      processTelemetryData()
    }
  }, [isLoaded, R, Q, originalTelemetryData, useKalmanFilter])

  const processTelemetryData = () => {
    const filtered = originalTelemetryData.map((point) => {
      return {
        lat: kalmanFiltersRef.current.latFilter.filter(point.lat),
        lng: kalmanFiltersRef.current.lngFilter.filter(point.lng)
      }
    })

    setFilteredPath(filtered)
    setMarkers(useKalmanFilter ? filtered : originalTelemetryData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = () => {
    const lines = inputValue.split('\n')
    const data = lines
      .map((line) => {
        const [lat, lng, timestamp] = line.split(',').map((item) => item.trim())
        return {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: parseInt(timestamp)
        }
      })
      .filter((point) => !isNaN(point.lat) && !isNaN(point.lng) && !isNaN(point.timestamp))

    setOriginalTelemetryData(data)
    setInputValue('')
    processTelemetryData()
  }

  if (!isLoaded) {
    return <div className="text-center text-lg">Loading...</div>
  }

  return (
    <div className="w-full h-screen">
      <div className="bg-gray-100 p-4 shadow-md flex flex-col space-y-4">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Cole os dados aqui (lat, lng, timestamp)"
          className="border border-gray-300 rounded-md p-2 h-32"
        />
        <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Adicionar Dados
        </button>

        <div className="flex items-center">
          <label className="mr-2">R (Noise power): </label>
          <input
            type="number"
            step="0.01"
            value={R}
            onChange={(e) => setR(parseFloat(e.target.value))}
            className="p-1 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center">
          <label className="mr-2">Q (Process variance): </label>
          <input
            type="number"
            step="0.1"
            value={Q}
            onChange={(e) => setQ(parseFloat(e.target.value))}
            className="p-1 border border-gray-300 rounded-md"
          />
        </div>

        <button
          onClick={() => setUseKalmanFilter(!useKalmanFilter)}
          className={`px-4 py-2 rounded-md ${
            useKalmanFilter ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          } text-white`}
        >
          {useKalmanFilter ? 'Com Filtro' : 'Sem Filtro'}
        </button>

        <div className="text-lg font-semibold">
          {useKalmanFilter ? 'O filtro está aplicado' : 'O filtro não está aplicado'}
        </div>
      </div>

      <GoogleMap mapContainerStyle={containerStyle} center={initialPosition} zoom={14}>
        {markers.map((point, index) => (
          <Marker key={index} position={point} />
        ))}
      </GoogleMap>
    </div>
  )
}

export default Map
