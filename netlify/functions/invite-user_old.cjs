const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Pakotetaan lukemaan .env-tiedosto juuressa
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

exports.handler = async (event, context) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Ympäristömuuttujat puuttuvat! URL:${!!supabaseUrl}, KEY:${!!supabaseServiceKey}` }) 
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // MUUTOS 1: Otetaan vastaan emailin lisäksi myös role ja circle
    const { email, role, circle } = JSON.parse(event.body);
    
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authorization puuttuu' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: inviter }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !inviter) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Istunto ei ole voimassa' }) };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('role').eq('id', inviter.id).single();

    if (profileError || profile?.role !== 'superadmin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Käyttöoikeus evätty' }) };
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email, 
      // Varmista että tämä osoite täsmää sovelluksesi kanssa
      { redirectTo: 'http://localhost:3000/set-password' }
    );

    if (inviteError) throw inviteError;

    // MUUTOS 2: Tallennetaan frontendistä tulleet role ja circle tietokantaan
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .upsert([{    // <--- VAIHDA SANAAN UPSERT
        id: inviteData.user.id, 
        email: email, 
        role: role || 'user', 
        circle: circle || 'tuttu',
        permissions: { media: false, jobs: false, fitness: false } 
      }]);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Kutsu lähetetty onnistuneesti!' }),
    };

  } catch (error) {
    console.error("Virhe backendissä:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};