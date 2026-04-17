import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import './index.css';

/* ── ICONE SVG INLINE ─────────────────────────────── */
const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/* ── HELPERS ─────────────────────────────────────── */
function fmtDateTime(dateVal) {
  if (!dateVal) return '--';
  return new Date(dateVal).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDuration(secs) {
  if (!secs) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ── LOGICA SIMULAZIONE FIFO ────────────────────── */
function runFifoSimulation(products, cycleTimeSeconds, startDate) {
  const stepTime = cycleTimeSeconds / 8;
  const startTs = new Date(startDate).getTime();
  let t = 0; // seconds from start
  
  // Create queue of passes
  let queue = products.map(p => ({
    ...p,
    passesDone: 0,
    entryTime: null,
    exitTime: null
  }));

  // Machine has 8 positions, each holds up to 2 items
  // Position 0 is entrance, position 7 is exit
  let machine = [[], [], [], [], [], [], [], []];
  let completed = [];

  // Continue while there are items in queue or in the machine
  while(queue.length > 0 || machine.some(pos => pos.length > 0)) {
    // 1. Items at machine position 7 (exit) finish their current pass
    let exiting = machine.pop(); 
    machine.unshift([]); // Add empty position 0

    exiting.forEach(pass => {
      pass.passesDone++;
      if (pass.passesDone < pass.totalPasses) {
        queue.push(pass); // Goes back to the queue
      } else {
        pass.exitTime = t;
        completed.push({...pass}); // Record final completion
      }
    });

    // 2. Load from queue to machine position 0
    while (machine[0].length < 2 && queue.length > 0) {
      let nextPass = queue.shift();
      if (nextPass.entryTime === null) {
        nextPass.entryTime = t;
      }
      machine[0].push(nextPass);
    }

    // 3. Advance time
    t += stepTime;
  }

  // Calculate actual Date objects
  const results = completed.map(p => {
    const entryTs = startTs + p.entryTime * 1000;
    const exitTs = startTs + p.exitTime * 1000;
    return {
      ...p,
      entryDate: new Date(entryTs),
      exitDate: new Date(exitTs),
      durationSeconds: p.exitTime - p.entryTime
    };
  });

  return results;
}

export default function SimulatorFifo() {
  const [formData, setFormData] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    cycleTime: 2048,
  });
  
  const [importedFile, setImportedFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [results, setResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Start from row 5 (index 4)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const dataRows = rows.slice(4);
        
        let parsed = [];
        let seenIds = new Set();

        dataRows.forEach(row => {
          if (!row || row.length === 0) return;
          
          // col O = 14 (Pilota), col M = 12 (Tipo 1), col N = 13 (Tipo 2)
          let id = row[14];
          let m = parseFloat(row[12]) || 0;
          let n = parseFloat(row[13]) || 0;
          
          if (id === undefined || id === null || String(id).trim() === '') return;
          id = String(id).trim();

          if (!seenIds.has(id)) {
            seenIds.add(id);
            const totalPasses = m + 2 * n;
            if (totalPasses > 0) {
              parsed.push({
                id,
                m,
                n,
                totalPasses
              });
            }
          }
        });

        if (parsed.length > 0) {
          setProducts(parsed);
          setImportedFile(file.name);
          setResults(null);
        } else {
          alert('Nessun prodotto valido trovato (colonne O, M, N a partire dalla riga 5).');
        }
      } catch (err) {
        console.error(err);
        alert('Errore durante la lettura del file Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const handleCalculate = (e) => {
    e.preventDefault();
    if (products.length === 0) {
      alert("Carica prima un file Excel con i dati!");
      return;
    }
    
    const resultsData = runFifoSimulation(products, Number(formData.cycleTime), formData.startTime);
    setResults({
      items: resultsData,
      totalDurationSeconds: Math.max(...resultsData.map(r => r.exitTime)),
      lastExitDate: new Date(Math.max(...resultsData.map(r => r.exitDate.getTime())))
    });
  };

  const exportCSV = () => {
    if (!results) return;
    const headers = ['Ord. Pilota', 'Passaggi tipo 1 (M)', 'Passaggi tipo 2 (N)', 'Passaggi equivalenti', 'Ingresso primo passaggio', 'Uscita finale', 'Tempo totale (s)'];
    const rows = results.items.map(r => [
      r.id, 
      r.m,
      r.n,
      r.totalPasses,
      r.entryDate.toLocaleString('it-IT').replace(',', ''),
      r.exitDate.toLocaleString('it-IT').replace(',', ''),
      r.durationSeconds
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `fifo_results.csv`;
    a.click();
  };

  const filteredResults = results?.items?.filter(r => 
    !searchTerm || String(r.id).toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="app-body">
      <div className="panel active sidebar-panel">
        <form onSubmit={handleCalculate}>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span>⚙ Parametri FIFO</span>
              <div>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current.click()} title="Carica Excel">
                  <IconUpload /> Importa Programmazione
                </button>
              </div>
            </div>

            {importedFile && (
              <div style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--success)' }}>
                <strong style={{ color: 'var(--success)' }}>✅ File Caricato: </strong> {importedFile}<br/>
                <small style={{ color: 'var(--text-dim)'}}>{products.length} prodotti unici identificati.</small>
              </div>
            )}

            <div className="form-group">
              <label>Data e ora inizio</label>
              <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required />
            </div>
            
            <div className="form-group mt-3">
              <label>Tempo ciclo (secondi)</label>
              <input type="number" name="cycleTime" min="1" value={formData.cycleTime} onChange={handleChange} required />
              <span className="input-hint">Default 2048 (step time = 256s)</span>
            </div>

            <div className="mt-4">
              <button type="submit" className="btn btn-primary" disabled={products.length === 0}>
                ⚡ Avvia Simulazione
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="panel active main-panel">
        {!results ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p>Nessun calcolo eseguito.<br />Carica un file Excel e calcola per vedere i risultati.</p>
          </div>
        ) : (
          <>
             <div className="results-header">
                <div className="section-title">Risultati Simulazione FIFO</div>
                <button className="btn btn-outline btn-sm" onClick={exportCSV}>
                  <IconDownload /> Esporta CSV
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">📦 Prodotti Totali</div>
                  <div className="stat-value">{products.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">🔄 Passaggi Totali Eq.</div>
                  <div className="stat-value">{products.reduce((acc, p) => acc + p.totalPasses, 0)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">🏁 Data Uscita Ultimo</div>
                  <div className="stat-value green" style={{fontSize: '1rem'}}>{fmtDateTime(results.lastExitDate)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">⏳ Durata Programma</div>
                  <div className="stat-value">{fmtDuration(results.totalDurationSeconds)}</div>
                </div>
              </div>

              <div className="card">
                <div className="search-box">
                  <span className="search-icon"><IconSearch /></span>
                  <input
                    type="search"
                    placeholder="Cerca per Ordine Pilota..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Ord. Pilota</th>
                        <th>Passaggi (T1/T2)</th>
                        <th>Pass. Equivalenti</th>
                        <th>Ingresso Primo</th>
                        <th>Uscita Finale</th>
                        <th>Tempo Trascorso</th>
                        <th>Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.id}</strong></td>
                          <td><span style={{color: 'var(--text-secondary)'}}>{row.m} / {row.n}</span></td>
                          <td><span className="badge badge-blue">{row.totalPasses}</span></td>
                          <td>{fmtDateTime(row.entryDate)}</td>
                          <td style={{ color: 'var(--success-light)', fontWeight: 600 }}>{fmtDateTime(row.exitDate)}</td>
                          <td>{fmtDuration(row.durationSeconds)}</td>
                          <td><span className="badge badge-green">Completato</span></td>
                        </tr>
                      ))}
                      {filteredResults.length === 0 && (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>Nessun record trovato</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </>
        )}
      </div>
    </div>
  );
}
