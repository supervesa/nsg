import React from 'react';
import { useSentinel } from '../../context/SentinelContext';
import AlbumManagement from './AlbumManagement';
import GlobalSettings from './GlobalSettings';

export default function MediaAdminPage() {
  const { userProfile, refreshSentinel, circleOptions, roleOptions } = useSentinel();

  return (
    <div className="layout-dashboard">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-title mb-2">MEDIA COMMAND CENTER</h1>
          <p className="text-technical">Yhdistetty NMC-arkistojen ja Sentinel-käyttäjäoikeuksien hallinta.</p>
        </div>
      </div>

      <AlbumManagement circleOptions={circleOptions} />
      
      <GlobalSettings 
        circleOptions={circleOptions} 
        roleOptions={roleOptions} 
        refreshSentinel={refreshSentinel}
        userProfile={userProfile}
      />
    </div>
  );
}