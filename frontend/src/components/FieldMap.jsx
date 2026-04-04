import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom green pin icon
const greenIcon = L.divIcon({
  html: `
    <div style="
      width: 22px; height: 22px;
      background: #173809;
      border: 3px solid #c5efad;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 14px rgba(23,56,9,0.55);
    "></div>
  `,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

/**
 * A read-only Leaflet map that shows a pinned user location.
 * Accepts `coordinates` as: { lat, lng, label } or null.
 * `zoom` defaults to 12.
 * `height` controls the map box height (CSS string, default '100%').
 */
const FieldMap = forwardRef(function FieldMap({ coordinates, zoom = 12, height = '100%', showLabel = true, geeUrlTemplate = null, popupContent = null }, ref) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  // Expose the Leaflet map instance to the parent
  useImperativeHandle(ref, () => ({
    getLeafletMap: () => mapRef.current,
    getContainer: () => containerRef.current,
  }))

  const lat = coordinates?.lat ?? 20.5937
  const lng = coordinates?.lng ?? 78.9629
  const label = coordinates?.label ?? null
  const hasPin = !!coordinates?.lat

  // Setup base map on mount
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: hasPin ? zoom : 4,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
    })

    // Standard base map (cartocdn light)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      crossOrigin: true
    }).addTo(map)

    if (hasPin) {
      const marker = L.marker([lat, lng], { icon: greenIcon }).addTo(map)
      
      if (popupContent) {
        marker.bindTooltip(
          `<div class="font-bold font-label text-[#173809]">${popupContent}</div>`, 
          { direction: 'top', offset: [0, -10] }
        )
      }

      // Subtle pulsing ring
      const ring = L.circleMarker([lat, lng], {
        radius: 22,
        color: '#c5efad',
        weight: 2,
        opacity: 0.5,
        fill: false,
      }).addTo(map)
      ring.getElement()?.style.setProperty('animation', 'pulse 2s infinite')
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle dynamic overlay changes
  const eeLayerRef = useRef(null)
  
  useEffect(() => {
    if (!mapRef.current || !geeUrlTemplate) return

    // Remove existing layer if it exists
    if (eeLayerRef.current) {
      mapRef.current.removeLayer(eeLayerRef.current)
    }

    // Add new layer
    eeLayerRef.current = L.tileLayer(geeUrlTemplate, { 
      maxZoom: 18, 
      opacity: 0.85, 
      zIndex: 100,
      crossOrigin: true 
    }).addTo(mapRef.current)

    return () => {
      if (mapRef.current && eeLayerRef.current) {
        mapRef.current.removeLayer(eeLayerRef.current)
      }
    }
  }, [geeUrlTemplate])

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Location label overlay */}
      {showLabel && label && (
        <div
          className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-4 py-2 rounded-full z-[9999] pointer-events-none"
          style={{ background: 'rgba(23,56,9,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <span className="material-symbols-outlined text-[#c5efad] text-sm flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            location_on
          </span>
          <span className="text-white text-xs font-label uppercase tracking-widest truncate">{label}</span>
        </div>
      )}

      {/* No location message */}
      {!hasPin && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#173809]/10 z-[9999] pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest text-[#173809]">
            No location anchored yet
          </div>
        </div>
      )}
    </div>
  )
})

export default FieldMap
