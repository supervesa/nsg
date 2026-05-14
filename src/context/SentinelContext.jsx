import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const SentinelContext = createContext();

const ROLE_HIERARCHY = ['user', 'moderator', 'admin', 'superadmin'];

export function SentinelProvider({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [systemModules, setSystemModules] = useState([]);
  const [isSentinelLoading, setIsSentinelLoading] = useState(true);
  
  // LISÄYS: Uudet tilat dynaamisille valikoille
  const [circleOptions, setCircleOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Ensimmäinen lataus, isBackground = false
          await loadSentinelData(session.user.id, false);
        } else {
          setUserProfile(null);
          setIsSentinelLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Lisätty isBackground-parametri. Jos true, UI ei mene lataustilaan.
  const loadSentinelData = async (userId, isBackground = false) => {
    if (!isBackground) {
      setIsSentinelLoading(true);
    }
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: modules } = await supabase
        .from('system_modules')
        .select('*')
        .eq('is_active', true);

      // LISÄYS: Haetaan piirit ja roolit
      const { data: circlesData } = await supabase
        .from('security_circles')
        .select('*')
        .order('sort_order');
        
      const { data: rolesData } = await supabase
        .from('role_permissions')
        .select('*');

      setUserProfile(profile);
      setSystemModules(modules || []);

      // LISÄYS: Asetetaan piirit ja roolit tiloihin
      if (circlesData) {
        setCircleOptions(circlesData.map(c => ({ value: c.value, label: c.label })));
      }
      if (rolesData) {
        setRoleOptions(rolesData.map(r => ({ value: r.role, label: r.label || r.role })));
      }

    } catch (error) {
      console.error('Sentinel kohtasi virheen:', error);
    } finally {
      setIsSentinelLoading(false);
    }
  };

  // Pehmeä päivitys taustalla (Soft Save)
  const refreshSentinel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Lähetetään true, jotta Sentinel tietää tämän olevan hiljainen taustapäivitys
      await loadSentinelData(user.id, true);
    }
  };

  const hasModule = (moduleKey) => {
    return userProfile?.permissions?.[moduleKey] === true;
  };

  const hasRole = (requiredRole) => {
    if (!userProfile) return false;
    const currentLevel = ROLE_HIERARCHY.indexOf(userProfile.role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
    return currentLevel >= requiredLevel;
  };

  const value = {
    userProfile,
    systemModules,
    isSentinelLoading,
    hasModule,
    hasRole,
    refreshSentinel,
    // LISÄYS: Välitetään uudet listat komponenteille
    circleOptions,
    roleOptions
  };

  return (
    <SentinelContext.Provider value={value}>
      {children}
    </SentinelContext.Provider>
  );
}

export const useSentinel = () => {
  return useContext(SentinelContext);
};