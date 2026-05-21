import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Image, Plus, Trash2, ShieldAlert, Link, Upload, Eye } from 'lucide-react'

export default function GalleryManager() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [alertConfig, setAlertConfig] = useState(null)

  const showAlert = (message, type = 'info') => {
    setAlertConfig({ message, type })
    setTimeout(() => {
      setAlertConfig((prev) => prev?.message === message ? null : prev)
    }, 6000)
  }

  // Form states
  const [matchId, setMatchId] = useState('')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // 1. Fetch Matches (for tagging dropdown)
  const { data: matches } = useQuery({
    queryKey: ['admin_gallery_matches'],
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
    queryKey: ['admin_gallery_photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select(`
          *,
          match:match_id (
            id,
            team1:team1_id (short_name),
            team2:team2_id (short_name)
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // 3. Upload file to Supabase Storage
  const handleFileUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `matches/${fileName}`

      // Upload file to 'gallery' bucket
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file)

      if (uploadError) {
        // Fallback or warning if bucket doesn't exist
        console.warn('Supabase storage upload failed:', uploadError)
        showAlert('Supabase storage bucket "gallery" might not exist or lacks upload permissions. Please use the URL text input fallback below!', 'warning')
        return
      }

      // Get public URL
      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        setImageUrl(data.publicUrl)
        showAlert('Image uploaded successfully! Click Submit to save to database.', 'success')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  // 4. Save to Database Mutation
  const savePhotoMutation = useMutation({
    mutationFn: async (photoData) => {
      const { data, error } = await supabase
        .from('gallery')
        .insert([photoData])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_gallery_photos'] })
      setShowAddForm(false)
      setMatchId('')
      setCaption('')
      setImageUrl('')
    }
  })

  // 5. Delete Photo Mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_gallery_photos'] })
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!imageUrl) {
      showAlert('Please upload an image or provide a valid Image URL first!', 'error')
      return
    }

    savePhotoMutation.mutate({
      match_id: matchId || null,
      caption,
      image_url: imageUrl
    })
  }

  return (
    <div className="space-y-8 relative">
      {/* Premium Toast Notification Banner */}
      {alertConfig && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-scaleUp">
          <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-350 ${
            alertConfig.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : alertConfig.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <span className="text-lg">
              {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '❌' : '⚠️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                {alertConfig.type === 'success' ? 'Success' : alertConfig.type === 'error' ? 'Error' : 'Warning'}
              </p>
              <p className="text-xs font-semibold leading-relaxed break-words">{alertConfig.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => setAlertConfig(null)}
              className="text-xs font-bold hover:opacity-75 shrink-0 pl-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Tournament Gallery Manager</h1>
          <p className="text-slate-400 text-xs font-semibold">Publish match snapshots, tag them to scheduled fixtures, and edit captions</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Gallery Snapshot
        </button>
      </div>

      {/* Add Photo Panel */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="telemetry-card p-6 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
            Upload Snapshot
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload Selector */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Option A: Upload File (Supabase Storage)
              </label>
              
              <div className="border-2 border-dashed border-white/10 hover:border-emerald-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-300">
                  {uploading ? 'Uploading image...' : 'Click to browse files'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">PNG, JPG or WebP up to 5MB</span>
              </div>
            </div>

            {/* URL Input Form details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Option B: Or Direct Image URL
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tag Specific Match (Optional)
                </label>
                <select
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                >
                  <option value="">-- General Tournament Photo --</option>
                  {matches?.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.team1?.short_name} vs {match.team2?.short_name} ({new Date(match.match_date).toLocaleDateString('en-US')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Snapshot Description Caption
            </label>
            <input
              type="text"
              placeholder="e.g. Captain lifting the winner cup during presentation ceremony"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-white/10 text-xs font-bold uppercase py-2 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savePhotoMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl shadow"
            >
              {savePhotoMutation.isPending ? 'Saving...' : 'Submit Snapshot'}
            </button>
          </div>
        </form>
      )}

      {/* Main Grid View */}
      {isLoading ? (
        <Spinner message="Loading gallery manager..." />
      ) : photos && photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="telemetry-card overflow-hidden relative group flex flex-col justify-between"
            >
              {/* Image box */}
              <div className="relative aspect-video shrink-0 overflow-hidden bg-slate-950/40 border-b border-white/10">
                <img
                  src={photo.image_url}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
                
                {/* Full screen toggle */}
                <button
                  onClick={() => setLightboxImg(photo.image_url)}
                  className="absolute top-2 left-2 p-1.5 bg-slate-950/70 text-white rounded-lg hover:bg-slate-950 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this photo?')) {
                      deletePhotoMutation.mutate(photo.id)
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Text footer summary */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-slate-350 text-xs font-medium leading-snug line-clamp-2">
                  {photo.caption || 'Tournament snapshot'}
                </p>
                
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>
                    {photo.match ? `${photo.match.team1?.short_name} vs ${photo.match.team2?.short_name}` : 'General'}
                  </span>
                  <span>{new Date(photo.created_at).toLocaleDateString('en-US')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="telemetry-card p-16 text-center text-slate-400">
          <Image className="w-10 h-10 mx-auto text-slate-550 mb-2" />
          <p className="text-sm font-semibold">No tournament photos registered.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Gallery Snapshot" above to upload the first photo.
          </p>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Gallery Lightbox"
            className="max-w-full max-h-[85vh] rounded-3xl border border-white/15 shadow-2xl object-contain animate-fadeIn"
          />
        </div>
      )}
    </div>
  )
}
