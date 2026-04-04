import { useState } from 'react'

export default function PhasePersonal({ data, update, next }) {
  const [dragging, setDragging] = useState(false)

  const readFile = (file) => {
    const reader = new FileReader()
    reader.onloadend = () => update({ profile_photo: reader.result })
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) readFile(f)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#173809]/30 mb-2">Step 1 of 3</p>
        <h2 className="font-headline text-3xl font-bold text-[#173809] tracking-tight">Your Identity</h2>
        <p className="text-sm text-[#173809]/50 mt-1">Tell us who's managing this field.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); next() }} className="space-y-5 flex-1">

        {/* Avatar upload */}
        <div
          className={`flex items-center gap-5 p-4 rounded-2xl border transition-colors cursor-pointer ${dragging ? 'border-[#173809]/30 bg-[#173809]/4' : 'border-[#173809]/10 bg-[#fafaf8]'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <label className="relative w-16 h-16 rounded-full bg-[#e7e3ca] border border-[#173809]/10 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 group">
            {data.profile_photo ? (
              <>
                <img src={data.profile_photo} alt="Portrait" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#173809]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-lg">edit</span>
                </div>
              </>
            ) : (
              <span className="material-symbols-outlined text-[#173809]/30 text-xl">person</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && readFile(e.target.files[0])} />
          </label>
          <div>
            <p className="text-xs font-bold text-[#173809] mb-0.5">
              {data.profile_photo ? 'Photo uploaded ✓' : 'Upload a photo'}
            </p>
            <p className="text-xs text-[#173809]/40">Optional · JPG, PNG supported</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Full Name</label>
          <input
            autoFocus required type="text"
            value={data.full_name}
            onChange={e => update({ full_name: e.target.value })}
            placeholder="Elena Thorne"
            className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-5 py-3.5 text-base font-medium text-[#173809] focus:outline-none focus:border-[#173809]/25 transition-colors placeholder:text-[#173809]/25"
          />
        </div>

        {/* Gender + Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Gender</label>
            <select
              required value={data.gender}
              onChange={e => update({ gender: e.target.value })}
              className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-5 py-3.5 text-base font-medium text-[#173809] focus:outline-none focus:border-[#173809]/25 transition-colors cursor-pointer appearance-none"
            >
              <option value="" disabled>Select…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#173809]/40 mb-2">Role / Title</label>
            <input
              required type="text"
              value={data.title}
              onChange={e => update({ title: e.target.value })}
              placeholder="Botanist"
              className="w-full bg-[#fafaf8] border border-[#173809]/10 rounded-xl px-5 py-3.5 text-base font-medium text-[#173809] focus:outline-none focus:border-[#173809]/25 transition-colors placeholder:text-[#173809]/25"
            />
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-[#173809] text-white rounded-xl py-4 px-8 font-bold text-sm uppercase tracking-widest hover:bg-[#2d4f1e] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group">
            Continue
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  )
}
