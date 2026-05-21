import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Image, Filter, Eye, Shield } from 'lucide-react'

export default function Gallery() {
  const [selectedMatch, setSelectedMatch] = useState('all')
  const [lightboxImg, setLightboxImg] = useState(null)

  // 1. Fetch Matches (for filtering dropdown)
  const { data: matches } = useQuery({
    queryKey: ['gallery_matches_filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          team1:team1_id (short_name),
          team2:team2_id (short_name)
        `)
        .order('match_date', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch All Gallery Photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ['all_gallery_photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select(`
          *,
          match:match_id (
            id,
            team1:team1_id (name, short_name),
            team2:team2_id (name, short_name)
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // Filter photos
  const filteredPhotos = photos?.filter((photo) => {
    return selectedMatch === 'all' || photo.match_id === selectedMatch
  })

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <Image className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mb-1">Tournament Gallery</h1>
          <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Explore memorable snapshots captured across matches</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="glass-panel-dark p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-450" /> Filter Photos
        </div>

        <div className="w-full sm:w-64">
          <select
            className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
          >
            <option value="all">All Matches</option>
            {matches?.map((match) => (
              <option key={match.id} value={match.id}>
                {match.team1?.short_name} vs {match.team2?.short_name} ({new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Images */}
      {isLoading ? (
        <Spinner message="Loading tournament gallery..." />
      ) : filteredPhotos && filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setLightboxImg(photo.image_url)}
              className="bento-card overflow-hidden shadow-lg cursor-pointer hover:border-emerald-500/20 transition-all hover:-translate-y-0.5 group relative aspect-video p-0!"
            >
              <img
                src={photo.image_url}
                alt={photo.caption || 'Tournament Snapshot'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Image Tags & Info */}
              <div className="absolute top-2 left-2">
                {photo.match ? (
                  <span className="bg-slate-950/80 backdrop-blur px-2.5 py-0.5 rounded-lg border border-white/5 text-[9px] font-extrabold text-emerald-450 uppercase tracking-wider shadow">
                    {photo.match.team1?.short_name} vs {photo.match.team2?.short_name}
                  </span>
                ) : (
                  <span className="bg-slate-950/80 backdrop-blur px-2.5 py-0.5 rounded-lg border border-white/5 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider shadow">
                    Tournament
                  </span>
                )}
              </div>

              {/* Hover overlay caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-0 transition-opacity duration-200">
                <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-md self-center mb-auto shadow flex items-center gap-1.5 mt-4">
                  <Eye className="w-3.5 h-3.5" /> Fullscreen
                </span>
                
                {/* Frosted Caption Strip */}
                <div className="bg-slate-950/70 backdrop-blur-md border-t border-white/5 p-3 w-full">
                  <p className="text-white font-extrabold text-xs leading-snug line-clamp-2">
                    {photo.caption || 'Tournament Snapshot'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bento-card p-16 text-center text-slate-450">
          <Image className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <p className="text-sm font-semibold">No photos in the gallery yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Uploaded photos tagged by tournament administrators will show up here.
          </p>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Gallery Lightbox"
            className="max-w-full max-h-[85vh] rounded-3xl border border-white/5 shadow-2xl object-contain animate-fadeIn"
          />
        </div>
      )}
    </div>
  )
}
