import { createClient } from '@supabase/supabase-js';

// Haetaan ympäristömuuttujat Viten kautta (.env.local -tiedostosta)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Pieni turvatarkistus: varoitetaan konsolissa, jos avaimet puuttuvat
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase-ympäristömuuttujia ei löydy! " +
    "Varmista, että .env.local on projektin juuressa ja sisältää VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY."
  );
}

// Luodaan ja viedään Supabase-asiakas koko sovelluksen käyttöön
export const supabase = createClient(supabaseUrl, supabaseAnonKey);