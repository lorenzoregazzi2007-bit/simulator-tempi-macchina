import { useState } from 'react';
import SimulatorBase from './SimulatorBase';
import SimulatorFifo from './SimulatorFifo';
import './index.css';

export default function App() {
  const [appMode, setAppMode] = useState('base'); // 'base' | 'fifo'

  return (
    <>
      <header className="app-header">
        <div className="app-header-logo">⚙️</div>
        <div style={{ flexGrow: 1 }}>
          <div className="app-header-title">SimApp Suite</div>
          <div className="app-header-subtitle">
            {appMode === 'base' ? 'Simulatore Tempi Macchina' : 'Programmazione Macchina FIFO'}
          </div>
        </div>
        
        <nav className="top-nav">
          <button 
            className={`nav-btn ${appMode === 'base' ? 'active' : ''}`}
            onClick={() => setAppMode('base')}
          >
            Base
          </button>
          <button 
            className={`nav-btn ${appMode === 'fifo' ? 'active' : ''}`}
            onClick={() => setAppMode('fifo')}
          >
            FIFO
          </button>
        </nav>
      </header>

      {appMode === 'base' ? <SimulatorBase /> : <SimulatorFifo />}
    </>
  );
}
