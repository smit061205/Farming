// Shared geolocation helpers — used by MapPicker (manual pin) and DashboardPage
// (one-tap "Enable Location" prompt for farmers who skipped it at signup).

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const a = data.address || {}
    const parts = [
      a.village || a.town || a.city || a.county,
      a.state_district || a.state,
      a.country,
    ].filter(Boolean)
    return parts.join(', ')
  } catch {
    return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
  }
}

// Wraps navigator.geolocation in a Promise and resolves { lat, lng, label }.
export function getDeviceLocation({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const label = await reverseGeocode(lat, lng)
        resolve({ lat, lng, label })
      },
      (err) => reject(err),
      { timeout, enableHighAccuracy: true }
    )
  })
}
