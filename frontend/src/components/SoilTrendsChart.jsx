import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

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

// Plots this field's own soil-health-score history — one real point per past
// soil test/recommendation run, not a fabricated placeholder series. Needs at
// least 2 points to draw a trend; callers should show an empty state below that.
export default function SoilTrendsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#173809" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#173809" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#173809" strokeOpacity={0.07} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#173809', fontWeight: 700, fontSize: 11, fontFamily: 'Space Grotesk' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#173809', fontSize: 10, fontFamily: 'Manrope' }}
          axisLine={false}
          tickLine={false}
          opacity={0.35}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#173809', strokeOpacity: 0.1 }} />
        <Area
          type="monotone"
          dataKey="health_score"
          name="AgriSense Score"
          stroke="#173809"
          strokeWidth={2.5}
          fill="url(#healthGrad)"
          dot={{ r: 3.5, fill: '#173809' }}
          activeDot={{ r: 5, fill: '#173809' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
