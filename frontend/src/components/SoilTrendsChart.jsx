import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const soilData = [
  { month: 'Oct', nutrients: 58, moisture: 42 },
  { month: 'Nov', nutrients: 65, moisture: 55 },
  { month: 'Dec', nutrients: 60, moisture: 48 },
  { month: 'Jan', nutrients: 72, moisture: 63 },
  { month: 'Feb', nutrients: 80, moisture: 70 },
  { month: 'Mar', nutrients: 92, moisture: 84 },
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
            <span className="font-bold">{p.value}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function SoilTrendsChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={soilData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="nutrientsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#173809" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#173809" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9f402d" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#9f402d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#173809" strokeOpacity={0.07} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#173809', fontWeight: 700, fontSize: 11, fontFamily: 'Space Grotesk' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#173809', fontSize: 10, fontFamily: 'Manrope' }}
          axisLine={false}
          tickLine={false}
          opacity={0.35}
          unit="%"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#173809', strokeOpacity: 0.1 }} />
        <Area
          type="monotone"
          dataKey="nutrients"
          name="Nutrients"
          stroke="#173809"
          strokeWidth={2.5}
          fill="url(#nutrientsGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#173809' }}
        />
        <Area
          type="monotone"
          dataKey="moisture"
          name="Moisture"
          stroke="#9f402d"
          strokeWidth={2.5}
          fill="url(#moistureGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#9f402d' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
