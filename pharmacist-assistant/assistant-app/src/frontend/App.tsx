// React App component for the chat interface

import React from 'react';
import Chat from './components/Chat';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>💊 Pharmacist Assistant</h1>
        <p className="subtitle">Your helpful medication information companion</p>
      </header>
      <main className="app-main">
        <Chat />
      </main>
      <footer className="app-footer">
        <p>⚕️ For medical advice, always consult a licensed healthcare professional</p>
      </footer>
    </div>
  );
};

export default App;
