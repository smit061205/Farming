import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLenderAuth } from "../context/LenderAuthContext";

export default function LenderNavbar({ activeLink = "dashboard" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lenderUser, lenderLogout } = useLenderAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    lenderLogout();
    navigate('/');
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // Mount/Unmount Google Translate widget
  const translateContainerRef = useRef(null);
  useEffect(() => {
    const wrapper = document.getElementById("google_translate_wrapper");

    const handleTranslateChange = (e) => {
      if (e.target && e.target.classList.contains("goog-te-combo")) {
        sessionStorage.setItem('user_changed_language', '1');
      }
    };

    if (wrapper && translateContainerRef.current) {
      wrapper.classList.remove("hidden");
      translateContainerRef.current.appendChild(wrapper);
      wrapper.addEventListener("change", handleTranslateChange);
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener("change", handleTranslateChange);
        wrapper.classList.add("hidden");
        document.body.appendChild(wrapper);
      }
    };
  }, []);

  const avatarInitial = lenderUser?.org_name ? lenderUser.org_name.charAt(0).toUpperCase() : 'G';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[rgba(254,250,224,0.85)] rounded-b-[2rem] w-full p-6 lg:px-12 flex justify-between items-center shadow-[0_10px_30px_rgba(23,56,9,0.04)] border-b border-[#173809]/5">
      <div className="flex items-center gap-4">
        <Link to="/lender" className="notranslate font-headline font-black text-2xl tracking-tighter text-[#173809]">
          तकनीकी टेरोइर <span className="text-[#173809]/60 ml-2 text-sm font-normal tracking-widest uppercase hidden lg:inline border-l border-[#173809]/20 pl-2">Partner Desktop</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 mr-4">
          <Link
            to="/lender/dashboard"
            className={`notranslate font-medium font-headline text-sm uppercase tracking-widest transition-colors duration-300 ${
              activeLink === "dashboard" || location.pathname === "/lender/dashboard"
                ? "text-[#173809] border-b-2 border-[#173809] pb-0.5"
                : "text-[#173809]/50 hover:text-[#173809]"
            }`}
          >
            Ledger
          </Link>
          <Link
            to="/lender/profile"
            className={`notranslate font-medium font-headline text-sm uppercase tracking-widest transition-colors duration-300 ${
              activeLink === "profile" || location.pathname === "/lender/profile"
                ? "text-[#173809] border-b-2 border-[#173809] pb-0.5"
                : "text-[#173809]/50 hover:text-[#173809]"
            }`}
          >
            Profile
          </Link>
        </div>

        {/* Translation Widget Container */}
        <div className="rounded-full hidden sm:block bg-[#173809]/5 px-2 py-1 border border-[#173809]/10">
          <div ref={translateContainerRef} className="flex items-center justify-center min-w-[130px]" />
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#173809] text-white ring-2 ring-transparent hover:ring-[#173809]/20 transition-all outline-none shadow-md"
          >
            <span className="font-headline font-black text-lg">{avatarInitial}</span>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-[#173809]/10 py-2 origin-top-right animate-in fade-in slide-in-from-top-2">
              <div className="px-5 py-3 border-b border-[#173809]/5 mb-2">
                <p className="font-headline font-bold text-[#173809] text-sm truncate">
                  {lenderUser?.org_name || 'Global Bank Demo'}
                </p>
                <p className="text-[#43493e]/60 text-xs truncate mt-0.5 font-bold">Lender Account</p>
              </div>

              {/* Mobile Links */}
              <div className="md:hidden">
                <Link
                  to="/lender/dashboard"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm text-[#43493e] hover:bg-[#e7e3ca] hover:text-[#173809] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  Live Ledger
                </Link>
                <Link
                  to="/lender/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm text-[#43493e] hover:bg-[#e7e3ca] hover:text-[#173809] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  Orchestration
                </Link>
                <div className="h-px bg-[#173809]/5 my-2"></div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-[#9f402d] hover:bg-[#9f402d]/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
