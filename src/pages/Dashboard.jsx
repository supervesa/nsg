import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useSentinel } from '../context/SentinelContext';
import UserTable from '../components/users/UserTable';
import InviteUserModal from '../components/users/InviteUserModal';
import UserSlideOver from '../components/users/UserSlideOver';

function Dashboard() {
  // Tuodaan uusi refreshSentinel -funktio
  const { userProfile, systemModules, hasRole, isSentinelLoading, refreshSentinel } = useSentinel();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error) setUsers(profiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePermission = async (userId, currentPerms, moduleKey) => {
    const safePerms = currentPerms || {};
    const newPerms = { ...safePerms, [moduleKey]: !safePerms[moduleKey] };

    const updatedUsers = users.map(u => u.id === userId ? { ...u, permissions: newPerms } : u);
    setUsers(updatedUsers);
    if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, permissions: newPerms });

    const { error } = await supabase.from('profiles').update({ permissions: newPerms }).eq('id', userId);
    
    if (error) {
      console.error('Virhe tallennuksessa:', error.message);
      alert('Tietokanta hylkäsi tallennuksen. Tarkista Supabasen RLS-oikeudet.');
      fetchUsers();
    } else {
      // SOFT SAVE: Jos päivitimme OMAT oikeudet, käsketään Sentinelin ladata tiedot salaa uudelleen!
      if (userProfile?.id === userId) {
        refreshSentinel(); 
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updatedUsers);
    if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, role: newRole });

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    
    if (error) {
      console.error('Virhe roolin vaihdossa:', error.message);
      fetchUsers();
    } else {
      // SOFT SAVE Omaan tiliin
      if (userProfile?.id === userId) refreshSentinel();
    }
  };

  const handleCircleChange = async (userId, newCircle) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, circle: newCircle } : u);
    setUsers(updatedUsers);
    if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, circle: newCircle });

    const { error } = await supabase.from('profiles').update({ circle: newCircle }).eq('id', userId);
    
    if (error) {
      console.error('Virhe piirin vaihdossa:', error.message);
      fetchUsers();
    } else {
       // SOFT SAVE Omaan tiliin
       if (userProfile?.id === userId) refreshSentinel();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Haluatko varmasti poistaa tämän käyttäjän?')) {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        console.error('Poistovirhe:', error.message);
      } else {
        fetchUsers();
      }
    }
  };

  if (isSentinelLoading) return <div className="layout-center text-technical">Ladataan turvatietoja...</div>;
  
  if (!hasRole('admin')) {
    return (
      <div className="layout-center">
        <div className="ui-panel p-8 text-center max-w-sm">
          <h2 className="text-error mb-4">Pääsy evätty</h2>
          <p className="text-muted mb-8">Keskushallinto on vain ylläpitäjille.</p>
          <button onClick={() => supabase.auth.signOut()} className="btn-secondary w-full">Kirjaudu ulos</button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-dashboard">
      <div className="flex-between mb-8">
        <div>
          <h2 className="text-title mb-2">Keskushallinto</h2>
          <p className="text-technical">Hallinnoi käyttäjiä, piirejä ja pääsyoikeuksia moduuleihin</p>
        </div>
        <div className="flex-row-gap">
          <button className="btn-primary btn-sm" onClick={() => setIsInviteModalOpen(true)}>
            + Uusi Käyttäjä
          </button>
          <button onClick={() => supabase.auth.signOut()} className="btn-secondary btn-sm">
            Kirjaudu ulos
          </button>
        </div>
      </div>

      <UserTable 
        users={users} 
        modules={systemModules} 
        loading={loading} 
        onUserClick={(user) => { setSelectedUser(user); setIsSlideOverOpen(true); }} 
        onDelete={handleDeleteUser}
      />
      
      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => { setIsInviteModalOpen(false); fetchUsers(); }} />

      <UserSlideOver 
        isOpen={isSlideOverOpen} 
        onClose={() => setIsSlideOverOpen(false)} 
        user={selectedUser}
        modules={systemModules}
        currentUserRole={userProfile?.role}
        onTogglePermission={handleTogglePermission}
        onRoleChange={handleRoleChange}
        onCircleChange={handleCircleChange}
      />
    </div>
  );
}

export default Dashboard;