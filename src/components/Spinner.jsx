import React from 'react'

export default function Spinner({ message = 'Loading details...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider animate-pulse">
        {message}
      </p>
    </div>
  )
}
