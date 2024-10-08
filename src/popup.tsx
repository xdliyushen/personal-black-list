import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/popup.scss';

const Popup = () => {
  const [blacklist, setBlacklist] = useState([]);
  const [newEntry, setNewEntry] = useState('');

  useEffect(() => {
    chrome.storage.sync.get('blacklist', ({ blacklist }) => {
      if (blacklist) setBlacklist(blacklist);
    });
  }, []);

  const addToBlacklist = () => {
    const updatedList = [...blacklist, newEntry];
    setBlacklist(updatedList);
    chrome.storage.sync.set({ blacklist: updatedList });
    setNewEntry('');
  };

  const removeFromBlacklist = (index: number) => {
    const updatedList = blacklist.filter((_, i) => i !== index);
    setBlacklist(updatedList);
    chrome.storage.sync.set({ blacklist: updatedList });
  };

  return (
    <div className="popup-container">
      <h2>Blacklist Manager</h2>
      <ul>
        {blacklist.map((entry, index) => (
          <li key={index}>
            {entry}
            <button onClick={() => removeFromBlacklist(index)}>Remove</button>
          </li>
        ))}
      </ul>
      <input 
        type="text" 
        value={newEntry} 
        onChange={(e) => setNewEntry(e.target.value)} 
        placeholder="Add new URL or regex" 
      />
      <button onClick={addToBlacklist}>Add</button>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Popup />);