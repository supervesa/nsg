import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useSentinel } from '../context/SentinelContext';
import Badge from '../components/common/Badge';
import Toggle from '../components/common/Toggle';
import Select from '../components/common/Select';

export default function Media() {
  const { userProfile, refreshSentinel } = useSentinel();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const circleOptions = [
    { value: 'julkinen', label: 'Julkinen' },
    { value: 'ystävät', label: 'Ystävät' },
    { value: 'perhe', label: 'Perhe' }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');

    if (!error) {
      const sortedUsers = (data || []).sort((a, b) => {
        const nameA = a.full_name || a.email || '';
        const nameB = b.full_name || b.email || '';
        return nameA.localeCompare(nameB);
      });
      setUsers(sortedUsers);
    } else {
      console.error('Virhe käyttäjien latauksessa:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- APUFUNKTIOT DATAN PARSIMISEEN ---
  
  // Varmistaa, että meillä on aina aito JS-objekti käsiteltävänä, vaikka kanta antaisi tekstiä
  const getParsedPermissions = (perms) => {
    if (typeof perms === 'string') {
      try { return JSON.parse(perms); } catch (e) { return {}; }
    }
    return (typeof perms === 'object' && perms !== null) ? perms : {};
  };

  // Hoitaa varsinaisen tietokantakutsun ja pakkaa datan tarvittaessa takaisin tekstiksi
  const updatePermissionsInDB = async (userId, currentRawPermissions, newParsedPermissions) => {
    // Jos alkuperäinen data oli tekstiä, tallennetaan se tekstinä. Muuten tallennetaan objektina.
    const valueToSave = typeof currentRawPermissions === 'string' 
      ? JSON.stringify(newParsedPermissions) 
      : newParsedPermissions;

    // Optimistinen päivitys UI:hin heti
    setUsers(users.map(u => u.id === userId ? { ...u, permissions: valueToSave } : u));

    const { error } = await supabase
      .from('profiles')
      .update({ permissions: valueToSave })
      .eq('id', userId);

    if (error) {
      console.error('Virhe tallennuksessa:', error.message);
      alert('Tietokanta hylkäsi tallennuksen.');
      fetchUsers(); // Palautetaan vanha tila
    } else if (userProfile?.id === userId) {
      // Jos muokkasit omia oikeuksiasi, kerrotaan Sentinelille
      refreshSentinel();
    }
  };

  // --- KÄSITTELIJÄT ---

  const handleToggleMediaAccess = (userId, rawPermissions, currentValue) => {
    const safePerms = getParsedPermissions(rawPermissions);
    const updatedPerms = { ...safePerms, media: currentValue };
    updatePermissionsInDB(userId, rawPermissions, updatedPerms);
  };

  const handleToggleUpload = (userId, rawPermissions, currentValue) => {
    const safePerms = getParsedPermissions(rawPermissions);
    const updatedPerms = { ...safePerms, can_upload: currentValue };
    updatePermissionsInDB(userId, rawPermissions, updatedPerms);
  };

  const handleChangeCircle = async (userId, newValue) => {
    setUsers(users.map(u => u.id === userId ? { ...u, circle: newValue } : u));

    const { error } = await supabase
      .from('profiles')
      .update({ circle: newValue })
      .eq('id', userId);

    if (error) {
      console.error('Virhe piirin päivityksessä:', error.message);
      fetchUsers();
    } else if (userProfile?.id === userId) {
      refreshSentinel();
    }
  };

  // --- RENDERÖINTI ---

  if (loading && users.length === 0) {
    return <div className="text-technical p-8 text-center">Etsitään käyttäjiä ja oikeuksia...</div>;
  }

  return (
    <div className="layout-dashboard">
      <div className="mb-8">
        <h2 className="text-title mb-2">Media-moduulin hallinta</h2>
        <p className="text-technical">Hallitse NMC-sovelluksen käyttöoikeuksia, latauslupia ja turvapiirejä.</p>
      </div>

      <div className="ui-panel table-wrapper">
        <table className="nsg-table">
          <thead>
            <tr>
              <th>Käyttäjä</th>
              <th>Rooli</th>
              <th className="text-center">Pääsy Mediaan</th>
              <th className="text-center">Latausoikeus</th>
              <th>Turvapiiri</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              // 1. Parsitaan permissions turvallisesti lukuun
              const permissions = getParsedPermissions(user.permissions);
              
              // 2. Selvitetään boolean-arvot Togleja varten
              const hasMedia = permissions.media === true;
              const canUpload = permissions.can_upload === true;
              
              const circle = user.circle || 'julkinen';
              const isHighRole = user.role === 'admin' || user.role === 'superadmin';

              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div className="flex-row-gap">
                        <span className="status-dot bg-saab"></span>
                        <span style={{ fontWeight: 500 }}>{user.full_name || 'Nimetön käyttäjä'}</span>
                      </div>
                      <span className="text-technical" style={{ fontSize: '0.75rem', marginLeft: '14px' }}>
                        {user.email || user.id}
                      </span>
                    </div>
                  </td>
                  
                  <td>
                    <Badge label={user.role || 'user'} isActive={isHighRole} />
                  </td>
                  
                  <td className="text-center">
                    <div style={{ display: 'inline-block' }}>
                      <Toggle 
                        checked={hasMedia} 
                        // Pakotetaan lähettämään TÄSMÄLLEEN vastakkainen boolean, jottei Toggle-komponentti pääse sotkemaan arvoa
                        onChange={() => handleToggleMediaAccess(user.id, user.permissions, !hasMedia)} 
                      />
                    </div>
                  </td>
                  
                  <td className="text-center">
                    <div style={{ display: 'inline-block' }}>
                      <Toggle 
                        checked={canUpload} 
                        onChange={() => handleToggleUpload(user.id, user.permissions, !canUpload)} 
                      />
                    </div>
                  </td>
                  
                  <td>
                    <Select 
                      value={circle}
                      options={circleOptions}
                      onChange={(val) => handleChangeCircle(user.id, val)}
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