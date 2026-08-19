import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { reverseGeocode } from '../../utils/geo'

// Fix default marker icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom green marker
const greenIcon = L.divIcon({
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background: #173809;
      border: 3px solid #c5efad;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(23,56,9,0.5);
    "></div>
  `,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

export default function MapPicker({ value, onChange, autoDetect = false }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapContainerRef = useRef(null)
  const [locationName, setLocationName] = useState(value?.label || '')
  const [isLocating, setIsLocating] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const placeMarker = useCallback(async (lat, lng) => {
    const map = mapRef.current
    if (!map) return

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { icon: greenIcon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', async (e) => {
        const pos = e.target.getLatLng()
        setIsGeocoding(true)
        const label = await reverseGeocode(pos.lat, pos.lng)
        setLocationName(label)
        onChange({ lat: pos.lat, lng: pos.lng, label })
        setIsGeocoding(false)
      })
    }

    setIsGeocoding(true)
    const label = await reverseGeocode(lat, lng)
    setLocationName(label)
    onChange({ lat, lng, label })
    setIsGeocoding(false)
  }, [onChange])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    const initialLat = value?.lat || 20.5937
    const initialLng = value?.lng || 78.9629
    const initialZoom = value?.lat ? 10 : 4

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map

    // If we already have a saved location, place the marker
    if (value?.lat && value?.lng) {
      placeMarker(value.lat, value.lng)
    }

    map.on('click', (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapRef.current?.flyTo([lat, lng], 13, { animate: true, duration: 1.5 })
        await placeMarker(lat, lng)
        setIsLocating(false)
      },
      () => {
        setIsLocating(false)
        alert('Could not access your location. Please enable location permissions.')
      },
      { timeout: 10000 }
    )
  }

  // Auto-attempt geolocation once on mount (no click needed) when the
  // caller opts in and there's no location already saved. Browsers still
  // show their own native permission prompt — we just don't wait for a
  // click to trigger it.
  const autoDetectAttempted = useRef(false)
  useEffect(() => {
    if (!autoDetect || autoDetectAttempted.current || value?.lat) return
    autoDetectAttempted.current = true
    handleUseMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect])

  return (
    <div className="w-full space-y-3">
      {/* Map container */}
      <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-[#173809]/10" style={{ height: '260px', boxShadow: '0 8px 30px rgba(23,56,9,0.08)' }}>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {/* Geocoding overlay */}
        {isGeocoding && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#173809]/90 text-[#c5efad] text-xs font-label uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 z-[9999]">
            <span className="w-2 h-2 bg-[#c5efad] rounded-full animate-pulse"></span>
            Resolving terrain...
          </div>
        )}

        {/* Click hint */}
        {!value?.lat && !isGeocoding && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9998]">
            <div className="bg-white/80 backdrop-blur-sm text-[#173809] text-xs font-label uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
              <span className="material-symbols-outlined text-sm">touch_app</span>
              Click to anchor your terrain
            </div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Use My Location button */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="flex items-center gap-2 bg-[#173809] text-white text-xs font-label uppercase tracking-widest font-bold px-5 py-3 rounded-full hover:bg-[#2d4f1e] active:scale-95 transition-all disabled:opacity-60"
          style={{ boxShadow: '0 4px 12px rgba(23,56,9,0.25)' }}
        >
          <span className="material-symbols-outlined text-[#c5efad] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isLocating ? 'progress_activity' : 'my_location'}
          </span>
          {isLocating ? 'Locating...' : 'Use My Location'}
        </button>

        {/* Resolved location name */}
        {locationName && (
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#c5efad]/30 px-4 py-3 rounded-full">
            <span className="material-symbols-outlined text-[#173809] text-sm flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="text-[#173809] text-xs font-body font-medium truncate">{locationName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
