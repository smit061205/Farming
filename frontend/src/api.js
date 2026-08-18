// Central API base URL — local dev talks to the local backend (VITE_API_URL, see .env),
// production build points directly at the live Render server to avoid Vercel env issues.
const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  : 'https://farming-pe99.onrender.com'
export default API_BASE
