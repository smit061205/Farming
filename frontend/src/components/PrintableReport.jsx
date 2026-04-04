import React from 'react';
import SensorNetworkView from '../pages/soil-views/SensorNetworkView';
import MicrobialMapsView from '../pages/soil-views/MicrobialMapsView';
import NutrientFlowView from '../pages/soil-views/NutrientFlowView';
import AtmosphericView from '../pages/soil-views/AtmosphericView';

export default function PrintableReport({ reportRef }) {
  return (
    <div
      ref={reportRef}
      style={{
        position: 'absolute',
        top: '-10000px',
        left: '-10000px',
        width: '1200px', // Fixed width to orchestrate a uniform PDF layout
        backgroundColor: '#fefae0', // Match main theme background
        color: '#1d1c0d',
      }}
      className="print-container overflow-hidden"
    >
      {/* Cover Page / Header */}
      <div className="p-16 border-b border-[#173809]/10 mb-16 bg-[#173809] text-white">
        <h1 className="text-6xl font-headline font-bold mb-4 tracking-tighter">Agritech Terroir Report</h1>
        <p className="text-xl font-medium text-[#c5efad]">North Vineyard • Block A-12 • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="p-16 space-y-32">
        {/* Force page breaks mathematically if we needed to, but html2pdf handles height splitting decent if we give margins */}
        <div className="report-section">
          <SensorNetworkView />
        </div>
        
        <div className="report-section html2pdf__page-break">
          <MicrobialMapsView />
        </div>

        <div className="report-section html2pdf__page-break">
          <NutrientFlowView />
        </div>

        <div className="report-section html2pdf__page-break">
          <AtmosphericView />
        </div>
      </div>
      
      {/* Footer Signature */}
      <div className="p-16 text-center text-[#173809]/40 font-bold tracking-widest text-xs uppercase border-t border-[#173809]/10">
        Generated securely by Agritech Earth Engine Terminal
      </div>
    </div>
  )
}
