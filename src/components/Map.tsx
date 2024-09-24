'use client'
import { ChangeEvent, useEffect, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

import { sample } from './sample'

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function Map() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
  })
  const [showFiltered, setShowFiltered] = useState(false)
  const [data, setData] = useState<number[][]>([])
  const [filteredData, setFilteredData] = useState<number[][]>([])
  const [center, setCenter] = useState({ lat: 0, lng: 0 })
  const [distanceThreshold, setDistanceThreshold] = useState(100)
  const [accuracyThreshold, setAccuracyThreshold] = useState(50)
  useEffect(() => {
    filterDataInputText(sample)
  }, [])
  const filterData = (inputData: number[][], distanceThreshold: number, accuracyThreshold: number) => {
    const filtered = inputData.filter((point, index, array) => {
      if (index === 0) return true
      const [prevLat, prevLong, , prevAccuracy] = array[index - 1]
      const [lat, long, , accuracy] = point
      const distance = haversineDistance(prevLat, prevLong, lat, long)
      return distance >= distanceThreshold && accuracy <= accuracyThreshold
    })
    setFilteredData(filtered)
  }
  const filterDataInputText = (text: string) => {
    const inputData = text
      .trim()
      .split('\n')
      .map((line) => {
        const [lat, long, time, accuracy] = line.split(',').map(Number)
        return [lat, long, time, accuracy]
      })
      .sort((a, b) => a[2] - b[2])
    setData(inputData)
    if (inputData.length > 0) {
      setCenter({ lat: inputData[0][0], lng: inputData[0][1] })
    }
    filterData(inputData, distanceThreshold, accuracyThreshold)
  }
  useEffect(() => {
    filterData(data, distanceThreshold, accuracyThreshold)
  }, [distanceThreshold, accuracyThreshold])
  if (!isLoaded) {
    return <div>Loading...</div>
  }
  const handleDistanceRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDistanceThreshold(Number(e.target.value))
    setShowFiltered(true)
  }
  const handleAccuracyRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccuracyThreshold(Number(e.target.value))
    setShowFiltered(true)
  }
  const percentage =
    data.length - filteredData.length > 0 ? ((data.length - filteredData.length) / data.length) * 100 : 0
  return (
    <div className="App">
      <div className="flex">
        <div className="flex flex-col p-2">
          <h2 className="text-2xl font-bold leading-7 text-center">Debugger 🐛</h2>
          <br />
          <div className="flex justify-center">
            <textarea
              defaultValue={sample}
              className="border p-2 w-full"
              rows={10}
              placeholder="Insira os dados de latitude, longitude, timestamp e accuracy aqui..."
              onChange={(e) => filterDataInputText(e.target.value)}
            />
          </div>
          <div className="my-4 text-center">
            <label className="mr-2">Distância de Filtragem (metros):</label>
            <input type="range" min="0" max="300" value={distanceThreshold} onChange={handleDistanceRangeChange} />
            <span className="ml-2">{distanceThreshold}m</span>
          </div>
          <div className="my-4 text-center">
            <label className="mr-2">Precisão de Filtragem (metros):</label>
            <input type="range" min="0" max="100" value={accuracyThreshold} onChange={handleAccuracyRangeChange} />
            <span className="ml-2">{accuracyThreshold}m</span>
          </div>
          <div className="flex justify-center my-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setShowFiltered(!showFiltered)}>
              {showFiltered ? 'Mostrar Dados Não Filtrados' : 'Mostrar Dados Filtrados'}
            </button>
          </div>
          <div className="my-4 text-center">
            <label className="mr-2">Porcentagem de Dados Filtrados:</label>
            <br />
            <label className="mr-2">
              {data.length - filteredData.length} de {data.length} ({percentage.toFixed(2)}%)
            </label>
          </div>
        </div>
        <GoogleMap mapContainerStyle={{ width: '100%', height: '100vh', overflow: 'none' }} center={center} zoom={15}>
          {(showFiltered ? filteredData : data).map(([lat, long, time, accuracy], index) => (
            <Marker
              key={index}
              title={`Time: ${new Date(time).toLocaleString()}, Accuracy: ${accuracy}m`}
              position={{ lat, lng: long }}
              icon={index === 0 ? { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' } : undefined}
            />
          ))}
        </GoogleMap>
      </div>
    </div>
  )
}

export default Map
