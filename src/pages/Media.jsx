import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useSentinel } from '../context/SentinelContext';
import Badge from '../components/common/Badge';
import Toggle from '../components/common/Toggle';
import Select from '../components/common/Select';

export default function Media() {
  // TUODAAN DYNAAMISET LISTAT SENTINELILTÄ
  const { userProfile, refreshSentinel, circleOptions, roleOptions } = useSentinel();
  
  const [users, setUsers] = useState([]);
  const [rolePermsDB, setRolePermsDB] = useState([]);
  const [loading, setLoading] = useState(true);

  // Haetaan data molemmista tauluista
  const fetchData = async () => {
    setLoading(true);

    const [rolesRes, usersRes] = await Promise.all([
      supabase.from('role_permissions').select('*'),
      supabase.from('profiles').select('*')
    ]);

    if (!rolesRes.error) setRolePermsDB(rolesRes.data || []);
    
    if (!usersRes.error) {
      const sortedUsers = (usersRes.data || []).sort((a, b) => {
        const nameA = a.full_name || a.email || '';
        const nameB = b.full_name || b.email || '';
        return nameA.localeCompare(nameB);
      });
      setUsers(sortedUsers);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- GLOBAALIEN ROOLIEN TALLENNUS ---
  const handleRoleToggle = async (roleName, field) => {
    const currentRoleData = rolePermsDB.find(r => r.role === roleName) || { role: roleName };
    const newValue = !currentRoleData[field];

    const updatedRoles = rolePermsDB.some(r => r.role === roleName)
      ? rolePermsDB.map(r => r.role === roleName ? { ...r, [field]: newValue } : r)
      : [...rolePermsDB, { ...currentRoleData, [field]: newValue }];
      
    setRolePermsDB(updatedRoles);

    const { error } = await supabase
      .from('role_permissions')
      .upsert({ role: roleName, [field]: newValue }, { onConflict: 'role' });

    if (error) {
      console.error('Virhe roolin tallennuksessa:', error.message);
      alert('Tietokanta hylkäsi tallennuksen. Tarkista Supabasen RLS-oikeudet.');
      fetchData();
    } else {
      refreshSentinel();
    }
  };

  // --- KÄYTTÄJIEN TALLENNUS ---
  const handleUserPermissionToggle = async (userId, currentPerms, moduleKey) => {
    const safePerms = typeof currentPerms === 'string' 
      ? (function(){ try { return JSON.parse(currentPerms); } catch(e) { return {}; } })() 
      : (currentPerms || {});

    const newPerms = { ...safePerms, [moduleKey]: !safePerms[moduleKey] };

    const updatedUsers = users.map(u => u.id === userId ? { ...u, permissions: newPerms } : u);
    setUsers(updatedUsers);

    const { error } = await supabase.from('profiles').update({ permissions: newPerms }).eq('id', userId);
    
    if (error) {
      console.error('Virhe tallennuksessa:', error.message);
      alert('Tietokanta hylkäsi tallennuksen.');
      fetchData();
    } else {
      if (userProfile?.id === userId) {
        refreshSentinel(); 
      }
    }
  };

  const handleCircleChange = async (userId, newCircle) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, circle: newCircle } : u);
    setUsers(updatedUsers);

    const { error } = await supabase.from('profiles').update({ circle: newCircle }).eq('id', userId);
    
    if (error) {
      console.error('Virhe piirin vaihdossa:', error.message);
      fetchData();
    } else {
       if (userProfile?.id === userId) refreshSentinel();
    }
  };

  if (loading && users.length === 0) {
    return <div className="layout-center text-technical">Ladataan järjestelmän tietoja...</div>;
  }

  return (
    <div className="layout-dashboard">
      
      {/* ----------- YLÄOSA: GLOBAALIT ROOLIT ----------- */}
      <div className="flex-between mb-8">
        <div>
          <h2 className="text-title mb-2">Globaalit Roolioikeudet</h2>
          <p className="text-technical">Määritä mitä kukin ylläpitotaso saa tehdä järjestelmässä ylätasolla.</p>
        </div>
      </div>

      <div className="ui-panel table-wrapper mb-8">
        <table className="nsg-table">
          <thead>
            <tr>
              <th>Rooli</th>
              <th>Latausoikeus (can_upload)</th>
              <th>Poisto-oikeus (can_delete)</th>
            </tr>
          </thead>
          <tbody>
            {/* KÄYTETÄÄN DYNAAMISTA LISTAA SENTINELILTÄ */}
            {roleOptions.map((roleOpt) => {
              const roleData = rolePermsDB.find(r => r.role === roleOpt.value) || {};
              const canUpload = roleData.can_upload === true;
              const canDelete = roleData.can_delete === true;

              return (
                <tr key={roleOpt.value}>
                  <td>
                    <Badge 
                      label={roleOpt.label} 
                      isActive={roleOpt.value === 'admin' || roleOpt.value === 'superadmin'} 
                    />
                  </td>
                  <td>
                    <Toggle 
                      isActive={canUpload} 
                      onToggle={() => handleRoleToggle(roleOpt.value, 'can_upload')} 
                    />
                  </td>
                  <td>
                    <Toggle 
                      isActive={canDelete} 
                      onToggle={() => handleRoleToggle(roleOpt.value, 'can_delete')} 
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* ----------- ALAOSA: KÄYTTÄJÄT JA POIKKEUKSET ----------- */}
      <div className="flex-between mb-8">
        <div>
          <h2 className="text-title mb-2">Käyttäjäkohtaiset Oikeudet</h2>
          <p className="text-technical">Salli pääsy Media-moduuliin (ovikoodi), aseta turvapiirit ja anna lataus-poikkeuksia.</p>
        </div>
      </div>

      <div className="ui-panel table-wrapper">
        <table className="nsg-table">
          <thead>
            <tr>
              <th>Käyttäjä</th>
              <th>Rooli</th>
              <th>Pääsy Mediaan (Ovi)</th>
              <th>Lataus (Poikkeuslupa)</th>
              <th>Turvapiiri</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const perms = typeof user.permissions === 'string' 
                ? (function(){ try { return JSON.parse(user.permissions); } catch(e) { return {}; } })() 
                : (user.permissions || {});
                
              const hasMediaAccess = perms.media === true;
              const hasSpecificUpload = perms.can_upload === true;
              const circle = user.circle || 'tuttu';
              
              const userRoleData = rolePermsDB.find(r => r.role === user.role) || {};
              const inheritsUpload = userRoleData.can_upload === true;

              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex-row-gap">
                      <span className="status-dot bg-saab"></span>
                      <span className="capitalize" style={{ fontWeight: 500 }}>{user.full_name || 'Nimetön käyttäjä'}</span>
                    </div>
                    <div className="text-technical" style={{ paddingLeft: '18px', fontSize: '0.75rem' }}>
                      {user.email || user.id}
                    </div>
                  </td>
                  
                  <td>
                    <span className="capitalize text-technical">{user.role || 'user'}</span>
                  </td>
                  
                  <td>
                    <Toggle 
                      isActive={hasMediaAccess} 
                      onToggle={() => handleUserPermissionToggle(user.id, user.permissions, 'media')} 
                    />
                  </td>
                  
                  <td>
                    {inheritsUpload ? (
                      <div className="flex-row-gap">
                        <div style={{ pointerEvents: 'none', opacity: 0.7 }}>
                          <Toggle isActive={true} onToggle={() => {}} />
                        </div>
                        <span className="text-technical text-sm">Periytyy roolista</span>
                      </div>
                    ) : (
                      <Toggle 
                        isActive={hasSpecificUpload} 
                        onToggle={() => handleUserPermissionToggle(user.id, user.permissions, 'can_upload')} 
                      />
                    )}
                  </td>
                  
                  <td>
                    <Select 
                      value={circle}
                      options={circleOptions} // DYNAAMINEN LISTA
                      onChange={(newCircle) => handleCircleChange(user.id, newCircle)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}