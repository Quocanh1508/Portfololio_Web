import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const url = window.__ENV__?.VITE_SUPABASE_URL
const anon = window.__ENV__?.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('Thiếu cấu hình Supabase. Vui lòng tạo scripts/env.js từ env.js.example')
}

export const supabase = createClient(url, anon)


