import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Custom pin — avoids Leaflet's default marker PNGs, which need manual
// asset-path fixes to survive a Vite bundle.
const PIN = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#173809;
    transform:rotate(-45deg);border:2px solid #FEFAE0;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

/**
 * Type-to-search (Open-Meteo's free geocoder) + a clickable map for picking
 * exactly where the field is. The dosing engine calibrates against this
 * point directly — nothing about zones is surfaced here.
 */
export default function LocationPicker({ lat, lon, onChange, onPlaceChange, t }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);

  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerObj = useRef(null);
  // A search pick already knows its place name — skip the one reverse-geocode
  // round trip that would otherwise fire right after it changes lat/lon.
  const skipNextReverseGeocode = useRef(false);
  // A reverse-geocode from an earlier map click/drag can resolve after the
  // farmer has already started typing a new search — don't let it clobber
  // text they're actively editing.
  const inputFocused = useRef(false);

  // ---- map init (once) ----
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, { attributionControl: false, zoomControl: true }).setView([lat, lon], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    const marker = L.marker([lat, lon], { icon: PIN, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onChange(Number(p.lat.toFixed(4)), Number(p.lng.toFixed(4)));
    });
    map.on('click', (e) => {
      onChange(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
    });
    mapObj.current = map;
    markerObj.current = marker;
    return () => { map.remove(); mapObj.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- keep map/marker in sync when lat/lon change from outside a drag ----
  useEffect(() => {
    if (!mapObj.current || !markerObj.current) return;
    markerObj.current.setLatLng([lat, lon]);
    mapObj.current.setView([lat, lon], mapObj.current.getZoom());
  }, [lat, lon]);

  // ---- type-to-search, debounced ----
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
        const data = await res.json();
        const all = data.results || [];
        // India first — this app's zones only cover Gujarat, so a match
        // there is far more likely to be the right one.
        all.sort((a, b) => (b.country === 'India') - (a.country === 'India'));
        setResults(all);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  // ---- reverse-geocode whenever the pin moves by click/drag/GPS, so the
  // recommendation can be labelled with a real place instead of a fallback
  // like "Your area" ----
  useEffect(() => {
    if (skipNextReverseGeocode.current) { skipNextReverseGeocode.current = false; return; }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
        const data = await res.json();
        const a = data.address || {};
        const place = [a.city || a.town || a.village || a.county || a.state_district, a.state].filter(Boolean).join(', ') || data.display_name;
        if (place) {
          onPlaceChange?.(place);
          if (!inputFocused.current) setQuery(place);
        }
      } catch {
        // No place label this time — the recommendation still works, just
        // without a named location to show.
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  const pick = (r) => {
    const place = `${r.name}${r.admin1 ? `, ${r.admin1}` : ''}`;
    skipNextReverseGeocode.current = true;
    onChange(Number(r.latitude.toFixed(4)), Number(r.longitude.toFixed(4)));
    onPlaceChange?.(place);
    setQuery(place);
    setResults([]);
    setOpen(false);
  };

  const detect = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(Number(pos.coords.latitude.toFixed(4)), Number(pos.coords.longitude.toFixed(4)));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="label">{t('location')}</label>
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            className="field flex-1"
            placeholder={t('locationSearchPlaceholder')}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); inputFocused.current = true; }}
            onBlur={() => { inputFocused.current = false; }}
          />
          <button type="button" onClick={detect} className="btn-ghost whitespace-nowrap">
            {locating ? t('detecting') : t('detect')}
          </button>
        </div>

        {open && (searching || results.length > 0) && (
          <div className="absolute z-[2000] left-0 right-0 mt-1 bg-white border border-leaf-300 shadow-lift max-h-64 overflow-y-auto">
            {searching && <div className="px-4 py-3 text-sm text-leaf-500">{t('searching')}</div>}
            {!searching && results.map((r, i) => (
              <button
                key={`${r.latitude}-${r.longitude}-${i}`}
                type="button"
                onClick={() => pick(r)}
                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-sprout/50 border-b border-leaf-100 last:border-0"
              >
                <span className="font-semibold text-leaf-800">{r.name}</span>
                <span className="text-leaf-500">{[r.admin1, r.country].filter(Boolean).join(', ') ? ` — ${[r.admin1, r.country].filter(Boolean).join(', ')}` : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={mapRef} className="h-56 mt-3 border border-leaf-300" />

      <p className="hint">{t('locationHint')}</p>
    </div>
  );
}
