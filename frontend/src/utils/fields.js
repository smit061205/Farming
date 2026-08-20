// Shared helpers for resolving which of a farmer's fields is currently active.
// A `fieldId` of null/undefined means the primary field (user.soil_data).

export function resolveField(user, fieldId) {
  if (fieldId) {
    const match = (user?.fields || []).find(f => f.id === fieldId)
    if (match) return match
  }
  return user?.soil_data || {}
}

export function buildFieldTabs(user) {
  return [
    { id: null, label: user?.soil_data?.cropType || 'Primary Field' },
    ...(user?.fields || []).map(f => ({ id: f.id, label: f.cropType })),
  ]
}
