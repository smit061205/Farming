import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { t as translate, SUPPORTED_LANGS } from "../i18n";

const NAV_LINKS = [
  { key: "nav.dashboard", path: "/dashboard" },
  { key: "nav.soilHealth", path: "/soil-health" },
  { key: "nav.fertilizers", path: "/fertilizer-hub" },
  { key: "nav.roadmap", path: "/roadmap" },
  { key: "nav.consult", path: "/consult" },
];

export default function Navbar() {
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const menuRef = useRef(null);

  // Real curated translations for this nav chrome — independent of Google
  // Translate (which deliberately never touches this component, see the
  // `notranslate` classes below). Tracks whichever language the farmer picks
  // from the same Select Language dropdown, kept in sync with Google
  // Translate's own selector so there's only one control to reason about.
  const [uiLang, setUiLang] = useState(() => sessionStorage.getItem('agrisense_ui_lang') || 'en')
  const t = (key) => translate(key, uiLang)

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

    // Intercept Google Translate changes to mark that the user manually
    // picked a language — App.jsx will respect this flag and never auto-override.
    // We let Google's script handle the actual DOM translation in-place.
    const handleTranslateChange = (e) => {
      if (e.target && e.target.classList.contains("goog-te-combo")) {
        sessionStorage.setItem('user_changed_language', '1')
        // Only nav chrome has real curated translations (see i18n.js) — any
        // other Google Translate language just falls back to English here,
        // while Google's own script still translates the rest of the page.
        const picked = e.target.value
        const nextUiLang = SUPPORTED_LANGS.includes(picked) ? picked : 'en'
        sessionStorage.setItem('agrisense_ui_lang', nextUiLang)
        setUiLang(nextUiLang)
      }
    };

    if (wrapper && translateContainerRef.current) {
      wrapper.classList.remove("hidden");
      translateContainerRef.current.appendChild(wrapper);
      wrapper.addEventListener("change", handleTranslateChange);
    }

    return () => {
      // Safely park it back in the body so it isn't destroyed
      if (wrapper) {
        wrapper.removeEventListener("change", handleTranslateChange);
        wrapper.classList.add("hidden");
        document.body.appendChild(wrapper);
      }
    };
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl rounded-b-[2rem] md:rounded-b-[3rem] shadow-[0_10px_30px_rgba(23,56,9,0.04)]"
      style={{ backgroundColor: "rgba(254,250,224,0.7)" }}
    >
      <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-12 py-4 md:py-6 max-w-[1920px] mx-auto gap-3 md:gap-8">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setShowMobileNav(v => !v)}
            className="md:hidden shrink-0 text-[#173809] p-1 -ml-1"
            aria-label="Toggle menu"
            aria-expanded={showMobileNav}
          >
            <span className="material-symbols-outlined text-3xl">
              {showMobileNav ? "close" : "menu"}
            </span>
          </button>
          <Link
            to={token ? "/dashboard" : "/"}
            className="text-xl sm:text-2xl font-black text-[#173809] uppercase tracking-tighter font-headline hover:opacity-80 transition-opacity truncate"
          >
            AgriSense
          </Link>
        </div>
        <div className="hidden md:flex gap-12 items-center">
          {NAV_LINKS.map(({ key, path }) => (
            <Link
              key={path}
              to={path}
              className={`notranslate font-medium font-headline text-sm uppercase tracking-widest transition-colors duration-300 ${
                location.pathname === path
                  ? "text-[#9f402d] border-b-2 border-[#9f402d] pb-0.5"
                  : "text-[#173809]/60 hover:text-[#9f402d]"
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </div>
        <div
          className="flex flex-1 justify-end items-center gap-2 sm:gap-4 relative min-w-0"
          ref={menuRef}
        >
          {/* Render target for Google Translate */}
          <div
            ref={translateContainerRef}
            className="translate-wrapper flex items-center justify-center shrink-0 max-w-[92px] sm:max-w-none overflow-hidden"
          ></div>

          {token ? (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="notranslate flex items-center gap-3 bg-[#e7e3ca]/50 hover:bg-[#e7e3ca] rounded-full pl-5 pr-3 py-2 transition-colors duration-300"
              >
                <span className="font-headline font-bold text-sm text-[#173809] uppercase tracking-widest hidden sm:block">
                  {user ? user.full_name : "Farmer"}
                </span>
                <span className="material-symbols-outlined text-[#173809] text-3xl">
                  account_circle
                </span>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl overflow-hidden py-3 border border-[#173809]/5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-6 py-3 border-b border-[#173809]/5 mb-2">
                    <p className="text-xs uppercase tracking-widest text-[#43493e] font-bold">
                      {t('nav.signedInAs')}
                    </p>
                    <p className="text-[#173809] font-headline font-bold mt-1 truncate">
                      {user ? user.email : "Loading..."}
                    </p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowMenu(false)}
                    className="notranslate flex items-center gap-3 px-6 py-3 hover:bg-[#e7e3ca]/30 text-sm font-bold text-[#173809] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      manage_accounts
                    </span>
                    {t('nav.manageProfile')}
                  </Link>

                  <Link
                    to="/contact"
                    onClick={() => setShowMenu(false)}
                    className="notranslate flex items-center gap-3 px-6 py-3 hover:bg-[#e7e3ca]/30 text-sm font-bold text-[#173809] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      support_agent
                    </span>
                    {t('nav.fieldSupport')}
                  </Link>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="notranslate w-full flex items-center gap-3 px-6 py-3 hover:bg-[#9f402d]/10 text-sm font-bold text-[#9f402d] transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      logout
                    </span>
                    {t('nav.disconnect')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="notranslate bg-[#173809] text-white px-4 sm:px-5 py-2 rounded-full font-headline font-bold text-sm hover:bg-[#2d4f1e] active:scale-95 transition-all outline-none shadow-md whitespace-nowrap shrink-0"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Mobile Nav Drawer ── */}
      {showMobileNav && (
        <div className="md:hidden border-t border-[#173809]/10 px-4 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ key, path }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setShowMobileNav(false)}
                className={`notranslate font-headline font-bold text-base uppercase tracking-widest py-3 px-3 rounded-xl transition-colors ${
                  location.pathname === path
                    ? "text-[#9f402d] bg-[#9f402d]/8"
                    : "text-[#173809]/70 hover:bg-[#173809]/5"
                }`}
              >
                {t(key)}
              </Link>
            ))}
            {token && (
              <Link
                to="/profile"
                onClick={() => setShowMobileNav(false)}
                className="notranslate font-headline font-bold text-base uppercase tracking-widest py-3 px-3 rounded-xl text-[#173809]/70 hover:bg-[#173809]/5 transition-colors"
              >
                {t('nav.profile')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
