import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const SentinelContext = createContext();
const ROLE_HIERARCHY = ['user', 'moderator', 'admin', 'superadmin'];

export function SentinelProvider({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [systemModules, setSystemModules] = useState([]);
  const [isSentinelLoading, setIsSentinelLoading] = useState(true);
  
  const [circleOptions, setCircleOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          
          // Nyt vain pysäytämme ikuisen luupin ja annamme App.jsx:n ohjata
          if (event === 'PASSWORD_RECOVERY') {
            console.log('Sentinel: Tunnistettiin palautus, poistetaan lataus ja annetaan periksi reitittimelle.');
            setIsSentinelLoading(false);
            return; 
          }

          if (event === 'USER_UPDATED') {
            setIsSentinelLoading(false);
            return;
          }

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

      const { data: circlesData } = await supabase
        .from('security_circles')
        .select('*')
        .order('sort_order');
        
      const { data: rolesData } = await supabase
        .from('role_permissions')
        .select('*');

      setUserProfile(profile);
      setSystemModules(modules || []);

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

  const refreshSentinel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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