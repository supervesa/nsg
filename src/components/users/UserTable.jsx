import React from 'react';
import { Trash2 } from 'lucide-react';
import Badge from '../common/Badge';

function UserTable({ users, loading, modules, onUserClick, onDelete }) {
  if (loading && users.length === 0) {
    return <div className="text-technical p-8 text-center">Etsitään käyttäjiä ja moduuleja...</div>;
  }

  return (
    <div className="ui-panel table-wrapper">
      <table className="nsg-table">
        <thead>
          <tr>
            <th>Käyttäjä</th>
            <th>Piiri / Rooli</th>
            <th>Aktiiviset moduulit</th>
            <th className="text-right">Toiminnot</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} onClick={() => onUserClick(user)}>
              <td>
                <div className="flex-row-gap">
                  <span className="status-dot bg-saab"></span>
                  <span style={{ fontWeight: 500 }}>{user.email}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="capitalize text-main" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {user.circle || 'tuttu'}
                  </span>
                  <span className="capitalize text-technical" style={{ fontSize: '0.75rem' }}>
                    {user.role || 'user'}
                  </span>
                </div>
              </td>
              <td>
                <div className="flex-row-gap" style={{ flexWrap: 'wrap' }}>
                  {modules.map((mod) => (
                    <Badge 
                      key={mod.key} 
                      label={mod.label} 
                      isActive={user.permissions?.[mod.key] || false} 
                    />
                  ))}
                </div>
              </td>
              <td className="text-right">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(user.id); }} 
                  className="btn-icon" 
                  style={{ color: 'var(--color-rosso)' }}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;