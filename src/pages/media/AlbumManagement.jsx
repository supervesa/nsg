import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import Badge from '../../components/common/Badge';
import Select from '../../components/common/Select';

export default function AlbumManagement({ circleOptions }) {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlbums = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('nmc')
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setAlbums(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleVisibilityChange = async (albumId, newVisibility) => {
    setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, visibility: newVisibility } : a));
    
    const { error } = await supabase
      .schema('nmc')
      .from('albums')
      .update({ visibility: newVisibility })
      .eq('id', albumId);

    if (error) {
      console.error('Error updating nmc album:', error.message);
      fetchAlbums();
    }
  };

  if (loading) return <div className="text-technical">Ladataan nmc-arkistoja...</div>;

  return (
    <div className="mb-12">
      <div className="mb-4">
        <h2 className="text-title mb-2">NMC-Arkiston Hallinta</h2>
        <p className="text-technical">Määritä albumikohtaiset turvaluokitukset nmc-schemassa.</p>
      </div>

      <div className="ui-panel table-wrapper">
        <table className="nsg-table">
          <thead>
            <tr>
              <th>Albumi</th>
              <th>Luotu</th>
              <th>Status</th>
              <th>Muuta Piiriä</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((album) => (
              <tr key={album.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{album.title}</div>
                  <div className="text-technical" style={{ fontSize: '0.7rem' }}>{album.id.slice(0,8)}</div>
                </td>
                <td className="text-technical">
                  {new Date(album.created_at).toLocaleDateString('fi-FI')}
                </td>
                <td>
                  <Badge 
                    label={album.visibility} 
                    isActive={album.visibility !== 'julkinen'} 
                  />
                </td>
                <td>
                  <Select 
                    value={album.visibility}
                    options={circleOptions}
                    onChange={(newVal) => handleVisibilityChange(album.id, newVal)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}