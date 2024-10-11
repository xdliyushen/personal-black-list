import React from 'react';
import { createRoot } from 'react-dom/client';
import BlackList from './components/BlackList/index.tsx';
import PageTime from './components/PageTime/index.tsx';
import '../styles/popup.scss';

const Popup = () => {
  return (
    <div className="popup-container">
      <BlackList />
      <PageTime />
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Popup />);