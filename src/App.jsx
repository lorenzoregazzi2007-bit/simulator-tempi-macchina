import { useState, useEffect, useCallback } from 'react';
import { calculateMachineTimes } from './utils/calculator';
import './index.css';

/* ── ICONE SVG INLINE ─────────────────────────────── */
const IconCalc = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/>
  </svg>
);
const IconResults = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconHistory = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

/* ── HELPERS ─────────────────────────────────────── */
function fmtTime(dateVal) {
  return new Date(dateVal).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDateTime(dateVal) {
  return new Date(dateVal).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ── COMPONENTE PRINCIPALE ────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab] = useState('form');   // 'form' | 'results' | 'history'
  const [history, setHistory]     = useState([]);
  const [activeCalc, setActiveCalc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  /* Form state con valori di default sensati */
  const [formData, setFormData] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    stepTimeSeconds: 10,
    numRounds: 2,
    totalUnits: 100,
    extraSteps: 0,
  });
  const [exceptions, setExceptions] = useState([]);

  /* ── PERSISTENZA LOCALSTORAGE ─────────────────── */
  // Carico history all'avvio
  useEffect(() => {
    try {
      const raw = localStorage.getItem('machineCalcHistory_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          // Ripristina automaticamente l'ultimo calcolo
          setActiveCalc(parsed[0]);
        }
      }
    } catch (err) {
      console.warn('LocalStorage read error:', err);
    }
  }, []);

  // Salvo history ad ogni modifica
  useEffect(() => {
    try {
      localStorage.setItem('machineCalcHistory_v2', JSON.stringify(history));
    } catch (err) {
      console.warn('LocalStorage write error:', err);
    }
  }, [history]);

  /* ── HANDLERS FORM ────────────────────────────── */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const addException = useCallback(() => {
    setExceptions(prev => [...prev, { pieceId: '', rounds: '' }]);
  }, []);

  const removeException = useCallback((idx) => {
    setExceptions(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateException = useCallback((idx, field, value) => {
    setExceptions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  /* ── CALCOLO ──────────────────────────────────── */
  const handleCalculate = useCallback((e) => {
    e.preventDefault();

    const calcData = calculateMachineTimes({
      startTime: formData.startTime,
      stepTimeSeconds: Number(formData.stepTimeSeconds),
      numRounds: Number(formData.numRounds),
      totalUnits: Number(formData.totalUnits),
      extraStepsPerUnit: Number(formData.extraSteps),
      exceptions: exceptions.filter(ex => ex.pieceId && ex.rounds),
    });

    const newCalc = {
      id: Date.now().toString(),
      dateCreated: new Date().toISOString(),
      params: { ...formData, exceptions: [...exceptions] },
      ...calcData,
    };

    setHistory(prev => [newCalc, ...prev].slice(0, 50)); // max 50 in cronologia
    setActiveCalc(newCalc);
    setActiveTab('results'); // vai ai risultati subito
  }, [formData, exceptions]);

  /* ── CRONOLOGIA ───────────────────────────────── */
  const loadCalc = useCallback((item) => {
    setActiveCalc(item);
    setActiveTab('results');
  }, []);

  const deleteCalc = useCallback((e, id) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeCalc?.id === id) setActiveCalc(null);
  }, [activeCalc]);

  const clearHistory = useCallback(() => {
    if (window.confirm('Eliminare tutta la cronologia?')) {
      setHistory([]);
      setActiveCalc(null);
    }
  }, []);

  /* ── ESPORTAZIONE CSV ─────────────────────────── */
  const exportCSV = useCallback(() => {
    if (!activeCalc) return;
    const headers = ['Pezzo', 'Lotto', 'Giri', 'Ingresso', 'Uscita', 'Tempo (s)'];
    const rows = activeCalc.results.map(r => [
      r.id, r.batchId,
      r.actualRounds ?? activeCalc.params.numRounds,
      new Date(r.entryTime).toLocaleString('it-IT'),
      new Date(r.exitTime).toLocaleString('it-IT'),
      r.processingTimeSeconds,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `calcolo_${activeCalc.id}.csv`;
    a.click();
  }, [activeCalc]);

  /* ── RISULTATI FILTRATI ───────────────────────── */
  const filteredResults = activeCalc?.results.filter(r =>
    !searchTerm ||
    r.id.toString().includes(searchTerm) ||
    r.batchId.toString().includes(searchTerm)
  ) ?? [];

  /* ── JSX ──────────────────────────────────────── */
  return (
    <>
      {/* HEADER */}
      <header className="app-header">
        <div className="app-header-logo">⚙️</div>
        <div>
          <div className="app-header-title">Simulatore Tempi Macchina</div>
          <div className="app-header-subtitle">Calcolo produzione industriale</div>
        </div>
      </header>

      {/* BODY */}
      <div className="app-body">

        {/* ── PANNELLO FORM ─────────────────────── */}
        <div className={`panel${activeTab === 'form' ? ' active' : ''} sidebar-panel`}>
          <form onSubmit={handleCalculate}>

            <div className="card">
              <div className="card-title">⏱ Avvio e Pezzi</div>
              <div className="form-group">
                <label>Data e ora avvio macchina</label>
                <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Pezzi totali</label>
                  <input type="number" name="totalUnits" min="1" value={formData.totalUnits} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Secondi / step</label>
                  <input type="number" name="stepTimeSeconds" min="1" value={formData.stepTimeSeconds} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Giri di default</label>
                  <input type="number" name="numRounds" min="1" value={formData.numRounds} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Step extra (opz.)</label>
                  <input type="number" name="extraSteps" min="0" value={formData.extraSteps} onChange={handleChange} />
                  <span className="input-hint">Fermano la coda</span>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="exceptions-header">
                <div className="card-title" style={{marginBottom: 0}}>🔄 Eccezioni Giri</div>
                <button type="button" className="btn btn-outline btn-sm" onClick={addException}>
                  <IconPlus /> Aggiungi
                </button>
              </div>

              {exceptions.length === 0 ? (
                <p className="text-muted mt-2">Tutti i pezzi fanno {formData.numRounds} giri. Aggiungi un'eccezione per cambiarne uno.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {exceptions.map((ex, idx) => (
                    <div className="exception-row" key={idx}>
                      <input
                        type="number" placeholder="N° pezzo" min="1"
                        value={ex.pieceId}
                        onChange={e => updateException(idx, 'pieceId', e.target.value)}
                        required
                      />
                      <input
                        type="number" placeholder="Giri" min="1"
                        value={ex.rounds}
                        onChange={e => updateException(idx, 'rounds', e.target.value)}
                        required
                      />
                      <button type="button" className="btn btn-ghost btn-danger" onClick={() => removeException(idx)} title="Rimuovi">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3">
              <button type="submit" className="btn btn-primary">
                ⚡ Calcola Tempi di Uscita
              </button>
            </div>

          </form>
        </div>

        {/* ── PANNELLO RISULTATI ─────────────────── */}
        <div className={`panel${activeTab === 'results' ? ' active' : ''} main-panel`}>
          {!activeCalc ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>Nessun calcolo eseguito.<br />Vai su <strong>Calcola</strong> per iniziare.</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <div className="section-title">Risultati</div>
                <button className="btn btn-outline btn-sm" onClick={exportCSV}>
                  <IconDownload /> CSV
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">🟢 Primo pezzo esce</div>
                  <div className="stat-value">{fmtTime(activeCalc.results[0]?.exitTime)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">🏁 Ultimo pezzo esce</div>
                  <div className="stat-value green">{fmtTime(activeCalc.summary.lastExit)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">⏳ Durata totale</div>
                  <div className="stat-value">{fmtDuration(activeCalc.summary.totalDurationSeconds)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">📦 Lotti da 8 pz</div>
                  <div className="stat-value">{Math.ceil(activeCalc.summary.totalUnits / 8)}</div>
                </div>
              </div>

              <div className="card">
                <div className="search-box">
                  <span className="search-icon"><IconSearch /></span>
                  <input
                    type="search"
                    placeholder="Cerca pezzo o lotto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Lotto</th>
                        <th>Giri</th>
                        <th>Ingresso</th>
                        <th>Uscita</th>
                        <th>Tempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map(row => {
                        const isException = String(row.actualRounds) !== String(activeCalc.params.numRounds);
                        return (
                          <tr key={row.id}>
                            <td><strong>#{row.id}</strong></td>
                            <td><span className="badge badge-blue">{row.batchId}</span></td>
                            <td>
                              {isException
                                ? <span className="badge badge-green">{row.actualRounds}</span>
                                : row.actualRounds ?? activeCalc.params.numRounds
                              }
                            </td>
                            <td>{fmtDateTime(row.entryTime)}</td>
                            <td style={{ color: 'var(--success-light)', fontWeight: 600 }}>{fmtDateTime(row.exitTime)}</td>
                            <td>{fmtDuration(row.processingTimeSeconds)}</td>
                          </tr>
                        );
                      })}
                      {filteredResults.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>Nessun pezzo trovato</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── PANNELLO CRONOLOGIA ────────────────── */}
        <div className={`panel${activeTab === 'history' ? ' active' : ''} history-panel`}>
          <div className="results-header">
            <div className="section-title">📋 Cronologia</div>
            {history.length > 0 && (
              <button className="btn btn-ghost btn-danger btn-sm" onClick={clearHistory} title="Svuota tutto">
                <IconTrash />
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🕐</div>
              <p>Nessun calcolo salvato.<br />Esegui il primo calcolo per vederlo qui.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div
                  key={item.id}
                  className={`history-item${activeCalc?.id === item.id ? ' active-item' : ''}`}
                  onClick={() => loadCalc(item)}
                >
                  <div className="hi-top">
                    <div className="hi-title">{Number(item.params.totalUnits).toLocaleString()} pz · {item.params.stepTimeSeconds}s/step</div>
                    <button className="btn btn-ghost btn-danger history-delete" onClick={e => deleteCalc(e, item.id)} title="Elimina">✕</button>
                  </div>
                  <div className="hi-date">
                    {new Date(item.dateCreated).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="hi-badges">
                    <span className="badge badge-blue">{item.params.numRounds} giri</span>
                    {Number(item.params.extraSteps) > 0 && (
                      <span className="badge badge-green">+{item.params.extraSteps} step extra</span>
                    )}
                    {item.params.exceptions?.length > 0 && (
                      <span className="badge badge-green">{item.params.exceptions.length} eccez.</span>
                    )}
                    {item.summary && (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                        {fmtDuration(item.summary.totalDurationSeconds)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* TAB BAR (visibile solo mobile) */}
      <nav className="tab-bar">
        <button className={`tab-item${activeTab === 'form' ? ' active' : ''}`} onClick={() => setActiveTab('form')}>
          <IconCalc />
          Calcola
        </button>
        <button className={`tab-item${activeTab === 'results' ? ' active' : ''}`} onClick={() => setActiveTab('results')}>
          <IconResults />
          Risultati
        </button>
        <button className={`tab-item${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>
          <IconHistory />
          Cronologia
        </button>
      </nav>
    </>
  );
}
