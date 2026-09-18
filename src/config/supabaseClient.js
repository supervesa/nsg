import { createClient } from '@supabase/supabase-js';

// --- 1. VANHA PILVI-YHTEYS (Autentikaatio, Sentinel, Käyttäjät yms.) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Supabase-ympäristömuuttujia ei löydy!");
}
// Viedään pilviyhteys nimellä "supabase"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- 2. UUSI MAC MINI -YHTEYS (Kotiautomaatio, Espan yms.) ---
const macbaseUrl = import.meta.env.VITE_MACBASE_URL;
const macbaseAnonKey = import.meta.env.VITE_MACBASE_ANON_KEY;

if (!macbaseUrl || !macbaseAnonKey) {
    console.error('⚠️ Macbasen ympäristömuuttujat puuttuvat!');
}
// Viedään Mac Mini -yhteys nimellä "macbase"
export const macbase = createClient(macbaseUrl, macbaseAnonKey);