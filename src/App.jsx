import { useState, useEffect } from 'react';
import { calculateMachineTimes } from './utils/calculator';
import './index.css';

function App() {
  const [history, setHistory] = useState([]);
  const [activeCalc, setActiveCalc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    stepTimeSeconds: 10,
    numRounds: 1,
    totalUnits: 100,
    extraSteps: 0
  });

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calcHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      } catch (e) {
        console.error("Error parsing history from localstorage", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('calcHistory', JSON.stringify(history));
  }, [history]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    
    // Perform calculation
    const calcData = calculateMachineTimes({
      startTime: formData.startTime,
      stepTimeSeconds: formData.stepTimeSeconds,
      numRounds: formData.numRounds,
      totalUnits: formData.totalUnits,
      extraStepsPerUnit: formData.extraSteps
    });

    const newCalc = {
      id: Date.now().toString(),
      dateCreated: new Date().toISOString(),
      params: { ...formData },
      ...calcData
    };

    setHistory(prev => [newCalc, ...prev]);
    setActiveCalc(newCalc);
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeCalc?.id === id) {
      setActiveCalc(null);
    }
  };

  const exportCSV = () => {
    if (!activeCalc) return;
    
    // Generate CSV string
    const headers = ["ID Unità", "Lotto", "Ingresso", "Uscita", "Tempo in Macchina (s)"];
    
    const rows = activeCalc.results.map(row => [
      row.id,
      row.batchId,
      new Date(row.entryTime).toLocaleString(),
      new Date(row.exitTime).toLocaleString(),
      row.processingTimeSeconds
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `calcolo_${activeCalc.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter results for active calc based on search
  const filteredResults = activeCalc?.results.filter(r => 
    r.id.toString().includes(searchTerm) || 
    r.batchId.toString().includes(searchTerm)
  );

  return (
    <div className="app-container">
      {/* Sidebar for History */}
      <aside className="sidebar">
        <div>
          <h2>Cronologia</h2>
          <p style={{ fontSize: '0.875rem' }}>I tuoi calcoli recenti</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.length === 0 ? (
            <p style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '20px' }}>
              Nessun calcolo salvato
            </p>
          ) : (
            history.map(item => (
              <div 
                key={item.id} 
                className={`history-item ${activeCalc?.id === item.id ? 'active' : ''}`}
                onClick={() => setActiveCalc(item)}
              >
                <div className="history-header">
                  <div className="history-title">
                    {item.params.totalUnits} pz - {item.params.stepTimeSeconds}s/step
                  </div>
                  <button 
                    className="btn-icon history-delete btn-danger"
                    onClick={(e) => deleteHistoryItem(e, item.id)}
                    title="Elimina"
                  >
                    ✕
                  </button>
                </div>
                <div className="history-date">
                  {new Date(item.dateCreated).toLocaleString()}
                </div>
                <div className="history-stats mt-2">
                  <span className="badge badge-blue">{item.params.numRounds} Giri</span>
                  {item.params.extraSteps > 0 && (
                    <span className="badge badge-green">+{item.params.extraSteps} Extra</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <h1>Simulatore Tempi Macchina</h1>
        
        <div className="card" style={{ marginBottom: '32px' }}>
          <form onSubmit={handleCalculate}>
            <div className="form-row">
              <div className="form-group">
                <label>Data / Ora Avvio</label>
                <input 
                  type="datetime-local" 
                  name="startTime" 
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pezzi Totali (Quantità)</label>
                <input 
                  type="number" 
                  name="totalUnits" 
                  min="1"
                  value={formData.totalUnits}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            <div className="form-row mt-4">
              <div className="form-group">
                <label>Tempo singolo step (Secondi)</label>
                <input 
                  type="number" 
                  name="stepTimeSeconds" 
                  min="1"
                  value={formData.stepTimeSeconds}
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Numero di Giri (A lotto di 8)</label>
                <input 
                  type="number" 
                  name="numRounds" 
                  min="1"
                  value={formData.numRounds}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            <div className="form-row mt-4">
               <div className="form-group">
                <label>Step Extra a metà ciclo (Opzionale)</label>
                <input 
                  type="number" 
                  name="extraSteps" 
                  min="0"
                  value={formData.extraSteps}
                  onChange={handleChange}
                />
                <p style={{fontSize: '0.75rem', marginTop: '4px'}}>Fermano la coda. 0 se non presenti.</p>
              </div>
            </div>

            <div className="mt-6" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', maxWidth: '300px' }}>
                Calcola Tempi
              </button>
            </div>
          </form>
        </div>

        {activeCalc && (
          <div className="results-section">
            <div className="flex justify-between items-center mb-4">
              <h2>Risultati Calcolo</h2>
              <button className="btn btn-outline" onClick={exportCSV}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Esporta CSV
              </button>
            </div>

            <div className="summary-grid">
              <div className="stat-card">
                <span className="stat-label">Primo Pezzo in Macchina</span>
                <span className="stat-value" style={{fontSize: '1.25rem'}}>
                  {new Date(activeCalc.summary.firstEntry).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ultimo Pezzo Finito</span>
                <span className="stat-value" style={{fontSize: '1.25rem', color: 'var(--success)'}}>
                  {new Date(activeCalc.summary.lastExit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Durata Totale Produzione</span>
                <span className="stat-value">
                  {Math.floor(activeCalc.summary.totalDurationSeconds / 3600)}h {Math.floor((activeCalc.summary.totalDurationSeconds % 3600) / 60)}m
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Velocità Lotti (8pz)</span>
                <span className="stat-value" style={{fontSize: '1.25rem'}}>
                  {Math.floor(activeCalc.summary.totalDurationSeconds / Math.ceil(activeCalc.summary.totalUnits / 8))}s / lotto
                </span>
              </div>
            </div>

            <div className="card">
              <div className="search-box">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Cerca per ID pezzo o Lotto..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Pezzo N°</th>
                      <th>Lotto</th>
                      <th>Ingresso Macchina</th>
                      <th>Uscita Macchina</th>
                      <th>Tempo Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults?.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span style={{ fontWeight: '600' }}>#{row.id}</span>
                        </td>
                        <td>
                          <span className="badge badge-blue">Lotto {row.batchId}</span>
                        </td>
                        <td>{new Date(row.entryTime).toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '500' }}>
                          {new Date(row.exitTime).toLocaleString()}
                        </td>
                        <td>{row.processingTimeSeconds}s</td>
                      </tr>
                    ))}
                    {filteredResults?.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>
                          Nessun pezzo trovato con questa ricerca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
