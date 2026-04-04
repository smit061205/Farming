import { Link } from 'react-router-dom'

const footerLinks = [
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Sustainability', path: '/sustainability' },
  { label: 'Contact', path: '/contact' },
]

export default function Footer({ dark = false }) {
  return (
    <footer
      className="w-full px-12 py-16 flex flex-col md:flex-row justify-between items-center gap-8"
      style={{ backgroundColor: '#4e2500', color: '#fefae0' }}
    >
      <div className="flex flex-col items-center md:items-start">
        <Link to="/" className="font-headline font-bold text-[#fefae0] text-2xl mb-2 tracking-tighter uppercase hover:opacity-80 transition-opacity">
          Technological Terroir
        </Link>
        <p className="font-body text-sm uppercase tracking-widest text-[#fefae0]/50 max-w-xs text-center md:text-left">
          © 2026 Technological Terroir. The Digital Agrarian.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-12 font-body text-sm uppercase tracking-widest">
        {footerLinks.map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            className="text-[#fefae0]/50 hover:text-[#fefae0] transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  )
}
