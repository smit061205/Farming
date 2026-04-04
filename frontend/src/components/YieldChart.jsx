import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const allData = [
  { year: "'14", yield: 24, stress: 62 },
  { year: "'15", yield: 36, stress: 72 },
  { year: "'16", yield: 48, stress: 40 },
  { year: "'17", yield: 20, stress: 88 },
  { year: "'18", yield: 32, stress: 24 },
  { year: "'19", yield: 44, stress: 48 },
  { year: "'20", yield: 64, stress: 16 },
  { year: "'21", yield: 68, stress: 12 },
  { year: "'22", yield: 56, stress: 32 },
  { year: "'23", yield: 76, stress: 96 },
  { year: "'24", yield: 48, stress: 44 },
  { year: "'25", yield: 72, stress: 16 },
  { year: "'26", yield: 68, stress: 20 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1d1c0d] text-white px-5 py-4 rounded-2xl shadow-2xl text-sm">
        <p className="font-headline font-bold text-lg mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
            <span className="text-white/70 capitalize">{p.name}:</span>
            <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function YieldChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#173809" strokeOpacity={0.08} vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: '#173809', fontWeight: 700, fontSize: 11, fontFamily: 'Space Grotesk' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#173809', fontSize: 11, fontFamily: 'Manrope' }}
          axisLine={false}
          tickLine={false}
          opacity={0.4}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#173809', fillOpacity: 0.04 }} />
        <Bar
          dataKey="yield"
          name="Tons/Hectare"
          fill="#173809"
          radius={[8, 8, 0, 0]}
          maxBarSize={52}
        />
        <Line
          type="monotone"
          dataKey="stress"
          name="Drought Stress"
          stroke="#9f402d"
          strokeWidth={2.5}
          dot={{ fill: '#fefae0', stroke: '#9f402d', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#9f402d' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export { allData }
