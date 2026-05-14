import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

function InviteUserModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [circle, setCircle] = useState('tuttu'); // Uusi tila!
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); 
  const [errorMessage, setErrorMessage] = useState(''); 

  if (!isOpen) return null;

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Istunto vanhentunut, kirjaudu uudelleen.');

      const response = await fetch('/.netlify/functions/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session.access_token
        },
        // Lähetetään nyt MOLEMMAT backendille
        body: JSON.stringify({ email, role, circle }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kutsu epäonnistui');
      }

      setStatus('success');
      setTimeout(() => {
        setEmail('');
        setCircle('tuttu');
        setRole('user');
        onClose();
        setStatus(null);
      }, 2000);

    } catch (err) {
      console.error('Kutsuvirhe:', err);
      setErrorMessage(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-wrapper" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex-between">
          <h3 className="text-title" style={{ fontSize: '1.125rem' }}>Kutsu uusi käyttäjä</h3>
          <button className="btn-icon smooth-transition" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleInvite}>
          <div className="modal-content">
            {status === 'success' && (
              <div className="mb-6 p-4 text-white rounded-md text-sm" style={{ backgroundColor: 'var(--color-saab)' }}>
                Kutsu lähetetty onnistuneesti!
              </div>
            )}

            {status === 'error' && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                <strong>Virhe:</strong> {errorMessage}
              </div>
            )}

            <p className="text-muted mb-6">
              Määritä käyttäjälle turvaluokitus. Hän ei näe moduuleja ennen kuin kytket ne erikseen päälle.
            </p>

            <div className="mb-4">
              <label className="text-label mb-2">Sähköpostiosoite</label>
              <input 
                type="email" 
                className="ui-input smooth-transition w-full" 
                placeholder="matti.meikalainen@nsg.fi" 
                required
                disabled={loading || status === 'success'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* UUSI: Piirin valinta */}
            <div className="mb-4">
              <label className="text-label mb-2">Sosiaalinen piiri (Data-näkyvyys)</label>
              <select 
                className="ui-select smooth-transition"
                value={circle}
                disabled={loading || status === 'success'}
                onChange={(e) => setCircle(e.target.value)}
              >
                <option value="tuttu">Tuttu (Vain julkinen)</option>
                <option value="kaveri">Kaveri</option>
                <option value="ystava">Ystävä</option>
                <option value="sukulainen">Sukulainen</option>
                <option value="perhe">Perhe (Kaikkein yksityisin)</option>
              </select>
            </div>

            {/* PÄIVITETTY: Roolin valinta (mukana moderaattori) */}
            <div className="mb-6">
              <label className="text-label mb-2">Ylläpitotaso (Oikeudet)</label>
              <select 
                className="ui-select smooth-transition"
                value={role}
                disabled={loading || status === 'success'}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">Peruskäyttäjä (User)</option>
                <option value="moderator">Moderaattori</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary smooth-transition" 
              onClick={onClose}
              disabled={loading}
            >
              Peruuta
            </button>
            <button 
              type="submit" 
              className="btn-primary smooth-transition flex-center"
              style={{ width: 'auto', gap: '8px' }}
              disabled={loading || status === 'success'}
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Kutsutaan...' : 'Lähetä kutsu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteUserModal;