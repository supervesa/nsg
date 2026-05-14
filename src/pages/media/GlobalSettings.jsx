import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import Badge from '../../components/common/Badge';
import Toggle from '../../components/common/Toggle';
import Select from '../../components/common/Select';

export default function GlobalSettings({ circleOptions, roleOptions, refreshSentinel, userProfile }) {
  const [users, setUsers] = useState([]);
  const [rolePermsDB, setRolePermsDB] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, usersRes] = await Promise.all([
      supabase.from('role_permissions').select('*'),
      supabase.from('profiles').select('*')
    ]);
    if (!rolesRes.error) setRolePermsDB(rolesRes.data || []);
    if (!usersRes.error) {
      setUsers((usersRes.data || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleToggle = async (roleName, field) => {
    const current = rolePermsDB.find(r => r.role === roleName) || { role: roleName };
    const newValue = !current[field];
    const { error } = await supabase.from('role_permissions').upsert({ role: roleName, [field]: newValue }, { onConflict: 'role' });
    if (!error) {
      setRolePermsDB(prev => prev.map(r => r.role === roleName ? { ...r, [field]: newValue } : r));
      refreshSentinel();
    }
  };

  const handleUserToggle = async (userId, currentPerms, key) => {
    const perms = typeof currentPerms === 'string' ? JSON.parse(currentPerms || '{}') : (currentPerms || {});
    const newPerms = { ...perms, [key]: !perms[key] };
    const { error } = await supabase.from('profiles').update({ permissions: newPerms }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: newPerms } : u));
      if (userProfile?.id === userId) refreshSentinel();
    }
  };

  if (loading) return <div className="text-technical">Ladataan oikeuksia...</div>;

  return (
    <>
      <h2 className="text-title mb-4">Globaalit Roolioikeudet</h2>
      <div className="ui-panel table-wrapper mb-8">
        <table className="nsg-table">
          <thead>
            <tr><th>Rooli</th><th>Lataus</th><th>Poisto</th></tr>
          </thead>
          <tbody>
            {roleOptions.map(opt => {
              const data = rolePermsDB.find(r => r.role === opt.value) || {};
              return (
                <tr key={opt.value}>
                  <td><Badge label={opt.label} isActive={opt.value === 'admin' || opt.value === 'superadmin'} /></td>
                  <td><Toggle isActive={data.can_upload} onToggle={() => handleRoleToggle(opt.value, 'can_upload')} /></td>
                  <td><Toggle isActive={data.can_delete} onToggle={() => handleRoleToggle(opt.value, 'can_delete')} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-title mb-4">Käyttäjäkohtaiset Oikeudet</h2>
      <div className="ui-panel table-wrapper">
        <table className="nsg-table">
          <thead>
            <tr><th>Käyttäjä</th><th>Media (Ovi)</th><th>Lataus</th><th>Piiri</th></tr>
          </thead>
          <tbody>
            {users.map(user => {
              const perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '{}') : (user.permissions || {});
              const roleData = rolePermsDB.find(r => r.role === user.role) || {};
              return (
                <tr key={user.id}>
                  <td>{user.full_name || user.email}</td>
                  <td><Toggle isActive={perms.media} onToggle={() => handleUserToggle(user.id, user.permissions, 'media')} /></td>
                  <td><Toggle isActive={roleData.can_upload || perms.can_upload} onToggle={() => handleUserToggle(user.id, user.permissions, 'can_upload')} /></td>
                  <td><Select value={user.circle || 'tuttu'} options={circleOptions} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}