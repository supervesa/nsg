const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Pakotetaan lukemaan .env-tiedosto juuressa (hyödyllinen lokaalisti)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

exports.handler = async (event, context) => {
  // 1. CORS-otsakkeet (Tärkeä selaimen rajapintakutsuille)
  const headers = {
    'Access-Control-Allow-Origin': '*', // Voit myös rajata: event.headers.origin
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. Käsitellään selaimen preflight (OPTIONS) -pyyntö
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'CORS OK' };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: `Ympäristömuuttujat puuttuvat! URL:${!!supabaseUrl}, KEY:${!!supabaseServiceKey}` }) 
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { email, role, circle } = JSON.parse(event.body);
    
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authorization puuttuu' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: inviter }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !inviter) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Istunto ei ole voimassa' }) };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('role').eq('id', inviter.id).single();

    if (profileError || profile?.role !== 'superadmin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Käyttöoikeus evätty' }) };
    }

    // --- MUUTOS: Dynaaminen Redirect URL ---
    // Selvitetään mistä osoitteesta pyyntö tuli. 
    // Jos origin puuttuu jostain syystä, käytetään Netlifyn antamaa URLia tai lokaalia osoitetta.
    const siteUrl = event.headers.origin 
      || process.env.URL 
      || 'http://localhost:3000'; // Huom: Varmista onko Vite-porttisi 5173 vai 3000
    
    const redirectUrl = `${siteUrl}/set-password`;
    // ---------------------------------------

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email, 
      { redirectTo: redirectUrl }
    );

    if (inviteError) throw inviteError;

    // Varmistetaan että käyttäjä luotiin/palautettiin onnistuneesti
    if (!inviteData?.user?.id) {
       return { statusCode: 400, headers, body: JSON.stringify({ error: 'Käyttäjän luonti epäonnistui tai käyttäjä on jo olemassa.' }) };
    }

    // Tallennetaan frontendistä tulleet role ja circle tietokantaan
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .upsert([{
        id: inviteData.user.id, 
        email: email, 
        role: role || 'user', 
        circle: circle || 'tuttu',
        permissions: { media: false, jobs: false, fitness: false } 
      }]);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Kutsu lähetetty onnistuneesti!',
        redirect_used: redirectUrl // Voit jättää tämän debuggausta varten tai poistaa myöhemmin
      }),
    };

  } catch (error) {
    console.error("Virhe backendissä:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};