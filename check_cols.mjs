import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vlvxhfzrpfjqrlksimdr.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdnhoZnpycGZqcXJsa3NpbWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjEyNzIsImV4cCI6MjA5NDgzNzI3Mn0.hrPHE7qpoaS4iQIpeQXqKCgcR2TI_u1ZUXV7FCf6muo'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function test() {
  const { data, error } = await supabase.from('balls').select('*').limit(1)
  if (error) {
    console.error('Error fetching balls:', error)
  } else {
    console.log('Columns in balls table:', Object.keys(data[0] || {}))
  }
}

test()
