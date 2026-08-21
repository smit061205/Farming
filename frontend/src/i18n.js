// Real, curated translations for high-traffic UI chrome — starting with the
// Navbar, which Google Translate deliberately never touches (see the
// `notranslate` classes throughout Navbar.jsx) because retranslating live
// navigation on every render is exactly the kind of rapidly-changing element
// that causes the translate/React desync bug seen elsewhere in this app.
// Scoped deliberately: this covers simple, unambiguous chrome words, not the
// nuanced agronomy/dosing text elsewhere in the app — that needs a separate,
// more careful pass (ideally with native-speaker review) since a mistranslated
// "Apply Now" or "Over-Supplied" is a materially different kind of mistake
// than a mistranslated nav label.

const DICT = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.soilHealth': 'Soil Health',
    'nav.fertilizers': 'Fertilizers',
    'nav.roadmap': 'Roadmap',
    'nav.consult': 'Consult',
    'nav.signIn': 'Sign In',
    'nav.signedInAs': 'Signed in as',
    'nav.manageProfile': 'Manage Profile',
    'nav.fieldSupport': 'Field Support',
    'nav.disconnect': 'Disconnect',
    'nav.profile': 'Profile',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.soilHealth': 'मिट्टी स्वास्थ्य',
    'nav.fertilizers': 'खाद',
    'nav.roadmap': 'रोडमैप',
    'nav.consult': 'सलाह',
    'nav.signIn': 'साइन इन करें',
    'nav.signedInAs': 'इस रूप में साइन इन किया',
    'nav.manageProfile': 'प्रोफ़ाइल प्रबंधित करें',
    'nav.fieldSupport': 'फ़ील्ड सहायता',
    'nav.disconnect': 'लॉग आउट',
    'nav.profile': 'प्रोफ़ाइल',
  },
  gu: {
    'nav.dashboard': 'ડેશબોર્ડ',
    'nav.soilHealth': 'જમીન આરોગ્ય',
    'nav.fertilizers': 'ખાતર',
    'nav.roadmap': 'રોડમેપ',
    'nav.consult': 'સલાહ',
    'nav.signIn': 'સાઇન ઇન કરો',
    'nav.signedInAs': 'આ રીતે સાઇન ઇન થયેલ છે',
    'nav.manageProfile': 'પ્રોફાઇલ સંચાલિત કરો',
    'nav.fieldSupport': 'ફિલ્ડ સહાય',
    'nav.disconnect': 'લૉગ આઉટ',
    'nav.profile': 'પ્રોફાઇલ',
  },
}

export const SUPPORTED_LANGS = Object.keys(DICT)

export function t(key, lang) {
  const dict = DICT[lang] || DICT.en
  return dict[key] ?? DICT.en[key] ?? key
}
