import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/options.scss';

const Options = () => {
  const [fallbackUrl, setFallbackUrl] = useState('');

  useEffect(() => {
    chrome.storage.sync.get('fallbackUrl', ({ fallbackUrl }) => {
      if (fallbackUrl) setFallbackUrl(fallbackUrl);
    });
  }, []);

  const saveFallbackUrl = () => {
    chrome.storage.sync.set({ fallbackUrl });
  };

  return (
    <div className="options-container">
      <h2>Settings</h2>
      <div>
        <label>Fallback URL:</label>
        <input 
          type="text" 
          value={fallbackUrl} 
          onChange={(e) => setFallbackUrl(e.target.value)} 
          placeholder="Enter fallback URL" 
        />
        <button onClick={saveFallbackUrl}>Save</button>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Options />);
