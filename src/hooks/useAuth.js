import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Funktio, joka hakee käyttäjän profiilitiedot tietokannasta
    const fetchUserProfile = async (sessionUser) => {
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Haetaan rooli ja JSON-muotoiset oikeudet profiles-taulusta
        const { data, error } = await supabase
          .from('profiles')
          .select('role, permissions')
          .eq('id', sessionUser.id)
          .single();

        if (error) {
          console.error('Virhe profiilin haussa:', error.message);
          // Vaikka profiilia ei löytyisi, asetetaan auth-käyttäjä, 
          // mutta ilman erikoisoikeuksia
          setUser(sessionUser);
        } else {
          // Yhdistetään Auth-käyttäjä ja tietokannasta löytyneet roolit/oikeudet
          setUser({
            ...sessionUser,
            role: data.role,
            permissions: data.permissions
          });
        }
      } catch (err) {
        console.error('Odottamaton virhe:', err);
        setUser(sessionUser);
      } finally {
        setLoading(false);
      }
    };

    // 1. Tarkistetaan heti sivun ladatessa aktiivinen sessio
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Kuunnellaan tilan muutoksia (sisään/uloskirjautuminen)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}