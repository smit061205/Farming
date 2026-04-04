export default function ArchiveView() {
  const reports = [
    { id: 'FSR-04.24', date: 'April 02, 2026', type: 'Full Spectrum', status: 'Available' },
    { id: 'FSR-03.24', date: 'March 15, 2026', type: 'Biomass Only', status: 'Available' },
    { id: 'FSR-02.24', date: 'February 28, 2026', type: 'Full Spectrum', status: 'Archived' },
    { id: 'FSR-01.24', date: 'January 10, 2026', type: 'Soil Chemistry', status: 'Archived' },
  ]

  return (
    <>
      <div className="max-w-7xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8">
          <span className="text-[#9f402d] font-headline font-bold tracking-widest text-xs uppercase mb-4 block">Historical Database</span>
          <h1 className="text-6xl md:text-8xl font-headline font-bold text-[#173809] tracking-tighter leading-none mb-8">
            Report <br />Archive
          </h1>
          <p className="text-xl md:text-2xl text-[#43493e] font-light max-w-2xl leading-relaxed">
            Access past Field Status Reports and raw telemetry datasets.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-[#f8f4db] rounded-[2rem] p-4 md:p-10 soil-shadow overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-[#173809]/10">
                <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Report ID</th>
                <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Date Generated</th>
                <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Analysis Type</th>
                <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50">Status</th>
                <th className="pb-6 text-sm font-bold uppercase tracking-widest text-[#173809]/50 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-[#173809]/5 hover:bg-[#e7e3ca]/50 transition-colors group">
                  <td className="py-6">
                    <span className="font-headline font-bold text-[#173809]">{report.id}</span>
                  </td>
                  <td className="py-6">
                    <span className="text-[#43493e] font-medium">{report.date}</span>
                  </td>
                  <td className="py-6">
                    <span className="text-[#43493e]">{report.type}</span>
                  </td>
                  <td className="py-6">
                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                      report.status === 'Available' ? 'bg-[#c5efad] text-[#173809]' : 'bg-[#e7e3ca] text-[#43493e]'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <button className="text-[#173809] opacity-50 group-hover:opacity-100 hover:text-[#9f402d] transition-all flex items-center gap-2 ml-auto">
                      <span className="text-sm font-bold uppercase tracking-widest">Download PDF</span>
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
