import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eytysuurxsfsbimgpion.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dHlzdXVyeHNmc2JpbWdwaW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzExNTIsImV4cCI6MjA5MjA0NzE1Mn0.xmcnR_8tmorbB1_gkXqXpUrXUZVZz1s2gFmpnuQJU7E'

export const supabase = createClient(supabaseUrl, supabaseKey)