import { supabase } from '../config/supabase.js'

const { data, error } = await supabase
  .from('shops')
  .select('id')
  .limit(1)

if (error) {
  console.error('Supabase request failed:', error.message)
  process.exitCode = 1
} else {
  console.log('Supabase request successful')
  console.log('Rows returned:', data.length)
}
