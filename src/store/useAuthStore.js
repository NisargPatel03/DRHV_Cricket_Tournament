import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    set({ loading: true })
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const user = session.user
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      set({ user, profile: profile || null, loading: false })
    } else {
      set({ user: null, profile: null, loading: false })
    }

    // Listen for auth changes without blocking the event loop
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const user = session.user
        
        // Use state updater to check if already loaded to skip duplicate network calls
        set((state) => {
          if (state.user?.id === user.id && state.profile) {
            return { user, loading: false }
          }
          
          // Fetch asynchronously in the background to avoid deadlocking token refreshes
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data: profile }) => {
              set({ user, profile: profile || null, loading: false })
            })
            .catch(() => {
              set({ loading: false })
            })
            
          return { user, loading: false }
        })
      } else {
        set({ user: null, profile: null, loading: false })
      }
    })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  }
}))
