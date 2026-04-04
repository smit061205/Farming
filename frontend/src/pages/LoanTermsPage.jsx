import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const Section = ({ icon, title, children }) => (
  <section className="mb-12">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#173809]/10">
      <span className="material-symbols-outlined text-[#9f402d] text-2xl">{icon}</span>
      <h2 className="font-headline font-black text-xl text-[#173809] uppercase tracking-tight">{title}</h2>
    </div>
    <div className="space-y-3 text-[#43493e] leading-relaxed text-sm">{children}</div>
  </section>
)

export default function LoanTermsPage() {
  return (
    <div className="min-h-screen bg-[#fefae0] text-[#1d1c0d]">
      <Navbar />

      <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#9f402d] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <span className="material-symbols-outlined text-sm">gavel</span>
            Legal Agreement
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black text-[#173809] tracking-tighter leading-tight mb-4">
            Loan Marketplace<br />Terms & Conditions
          </h1>
          <p className="text-[#43493e] text-sm">
            Last updated: April 2026. Please read these terms carefully before submitting a loan application through the Technological Terroir Finance Hub.
          </p>
        </div>

        {/* Important Warning Banner */}
        <div className="bg-[#9f402d] text-white rounded-3xl p-6 mb-12 flex gap-4 items-start">
          <span className="material-symbols-outlined text-3xl shrink-0 mt-0.5">warning</span>
          <div>
            <p className="font-headline font-bold text-lg mb-1">No Guarantee of Funding</p>
            <p className="text-white/80 text-sm leading-relaxed">
              Technological Terroir is a data intelligence platform — <strong>not a bank, lender, or financial institution.</strong> We make no guarantee that any user will receive a loan, insurance policy, or financial product. Matching you with a partner does not constitute a pre-approval or offer of credit.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-[#173809]/5">

          <Section icon="hub" title="1. What This Platform Does">
            <p>
              Technological Terroir operates a <strong>data brokerage marketplace</strong> that connects verified farmers with institutional lenders and financial partners. Our role is limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generating a Risk Score based on your submitted soil chemistry and satellite imagery data</li>
              <li>Anonymously surfacing your aggregated profile to partner institutions</li>
              <li>Sending a formal expression of interest on your behalf</li>
            </ul>
            <p>
              We do <strong>not</strong> process loans, hold escrow, disburse funds, or set interest rates. All financial negotiations occur exclusively between you and the listed institution.
            </p>
          </Section>

          <Section icon="share" title="2. Farm Data Sharing Consent">
            <p>
              By submitting a loan application through this platform, you explicitly consent to the following data being shared with the selected financial partner:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Soil composition data:</strong> pH, Nitrogen (N), Phosphorus (P), Potassium (K), and Organic Matter readings</li>
              <li><strong>Satellite anomaly report:</strong> 30-day NDVI index, land-use classification, and flagged risk events from Sentinel-2 imagery</li>
              <li><strong>Geographic data:</strong> Farm GPS coordinates (bounding region, not exact PIN)</li>
              <li><strong>Application metadata:</strong> Loan type requested, amount, and intended use</li>
            </ul>
            <p className="bg-[#e7e3ca] p-3 rounded-xl font-medium">
              ⚠️ Your personally identifiable information (full name, Aadhaar, PAN, phone number) is <strong>never</strong> shared without an additional, explicit, bilateral consent step completed directly with the institution.
            </p>
          </Section>

          <Section icon="account_balance" title="3. Bank Account Information">
            <p>
              Bank account details submitted in the application form (account number, IFSC code, bank name) are used solely for the purpose of allowing the lending institution to identify the correct disbursement account if a loan is sanctioned. Technological Terroir:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Does not store bank details on our servers beyond 30 days from loan application</li>
              <li>Does not charge any amount to your account</li>
              <li>Does not initiate transfers of any kind</li>
              <li>Encrypts all bank data in transit (TLS 1.3) and at rest (AES-256)</li>
            </ul>
          </Section>

          <Section icon="money_off" title="4. No Commission & No Guarantee">
            <p>
              Technological Terroir charges <strong>zero commission</strong> on loan disbursements. We earn revenue exclusively from the institutional partner membership fees, not from you.
            </p>
            <p>
              We make absolutely no guarantee, warranty, or representation that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your application will be approved by any partner</li>
              <li>The interest rates displayed are final or binding</li>
              <li>A loan will be disbursed within any stated timeframe</li>
              <li>Any partner institution is guaranteed to be solvent or regulated</li>
            </ul>
            <p>
              You are strongly advised to independently verify the credentials and regulatory status of any lender before entering into a financial agreement.
            </p>
          </Section>

          <Section icon="security" title="5. Data Security & Retention">
            <p>
              We take the security of your agricultural and financial data seriously. Our infrastructure is hosted on industry-standard cloud infrastructure with SOC 2 Type II compliance targets. All farm scan data is retained for a maximum of 24 months from last login. You may request deletion at any time by contacting us through the Contact page.
            </p>
          </Section>

          <Section icon="balance" title="6. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable Indian law, Technological Terroir, its founders, employees, and affiliates shall not be liable for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Any loss of income, crop failure, or financial harm arising from a loan application being rejected</li>
              <li>Incorrect interest rates, misrepresented terms, or fraud perpetrated by a listed partner institution</li>
              <li>Any indirect, incidental, or consequential damages arising from use of the Finance Hub</li>
            </ul>
            <p>
              Our total liability in any dispute is capped at ₹0 — as we are a free marketplace platform and charge no fees to farmers.
            </p>
          </Section>

          <Section icon="edit_note" title="7. Changes to These Terms">
            <p>
              We reserve the right to update these terms at any time. The date at the top of this page reflects the most recent revision. Continued use of the Finance Hub after a revision constitutes acceptance of the updated terms.
            </p>
          </Section>

          {/* Close-out */}
          <div className="mt-8 pt-8 border-t border-[#173809]/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-[#43493e]/60">
              Questions? <Link to="/contact" className="text-[#9f402d] font-bold hover:underline">Contact us</Link>
            </p>
            <Link
              to="/loans"
              className="bg-[#173809] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#2d4f1e] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Finance Hub
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
