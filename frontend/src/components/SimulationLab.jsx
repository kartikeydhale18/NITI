import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, BrainCircuit, 
  Cpu, Database, Globe, FileSpreadsheet, RefreshCw, Layers, ArrowUpRight, ArrowDownRight, Minus, Trash2, Calendar, Upload
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

/**
 * SimulationLab Component (News Ingestion Hub & Dual-AI Rebalance Sandbox)
 * -------------------------------------------------------------------------
 * Features:
 * 1. Source Selector: [Local CSV Dataset] | [Live NewsAPI] | [Custom "What-If" Headline]
 * 2. Ingestion Controls: Fetch real headlines from CSVs or NewsAPI with query/limit options
 * 3. Ingested News Table: Browse articles and click "Analyze & Rebalance" on any headline
 * 4. Dual-Model Telemetry: FinBERT + Qwen2.5 consensus verification and SQLite trade execution
 */
export default function SimulationLab({ onExecuteRebalance, isAnalyzing, latestResult, sampleScenarios }) {
  // Ingestion Source Mode: 'csv' | 'newsapi' | 'manual'
  const [sourceMode, setSourceMode] = useState('csv');

  // CSV Ingestion State
  const [availableCsvs, setAvailableCsvs] = useState(['newsdata_labelled_v2.csv', 'newsdata_labelled_v3.csv', 'self_label.csv']);
  const [selectedCsv, setSelectedCsv] = useState('newsdata_labelled_v2.csv');
  const [csvLimit, setCsvLimit] = useState(10);
  const fileInputRef = useRef(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);

  // NewsAPI Ingestion State (Enforcing 24h delay on NewsAPI developer plan)
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const defaultFromStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 8);
    return d.toISOString().split('T')[0];
  })();
  const minFromStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  })();

  const [newsApiQuery, setNewsApiQuery] = useState('stocks OR finance OR economy');
  const [newsApiLimit, setNewsApiLimit] = useState(10);
  const [newsApiFromDate, setNewsApiFromDate] = useState(defaultFromStr);
  const [newsApiToDate, setNewsApiToDate] = useState(yesterdayStr);

  // Ingested Articles Feed
  const [ingestedArticles, setIngestedArticles] = useState([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'analyzed'

  // Manual Headline State
  const [headline, setHeadline] = useState('');
  const [tickerOverride, setTickerOverride] = useState('');

  // Load available CSV sources and any existing fetched articles on mount
  useEffect(() => {
    fetch(`${API_BASE}/news-sources`)
      .then(res => res.json())
      .then(data => {
        if (data.csv_files && data.csv_files.length > 0) {
          setAvailableCsvs(data.csv_files);
          if (data.default_csv) setSelectedCsv(data.default_csv);
        }
      })
      .catch(err => console.error('Error fetching news sources:', err));

    // Also load existing fetched articles from SQLite database
    fetch(`${API_BASE}/fetched-articles?limit=50`)
      .then(res => res.json())
      .then(data => {
        if (data.articles && data.articles.length > 0) {
          setIngestedArticles(data.articles);
        }
      })
      .catch(err => console.error('Error loading fetched articles:', err));
  }, []);

  // Fetch articles from backend (CSV or NewsAPI)
  const handleFetchArticles = async () => {
    await handleFetchArticlesWithFile(selectedCsv);
  };

  const handleFetchArticlesWithFile = async (csvFileToUse) => {
    setIsFetchingNews(true);
    setFetchError(null);
    try {
      const payload = {
        source: sourceMode,
        csv_filename: csvFileToUse || selectedCsv,
        query: newsApiQuery,
        from_date: sourceMode === 'newsapi' ? newsApiFromDate : undefined,
        to_date: sourceMode === 'newsapi' ? (newsApiToDate > yesterdayStr ? yesterdayStr : newsApiToDate) : undefined,
        limit: sourceMode === 'csv' ? Number(csvLimit) : Number(newsApiLimit),
        offset: 0
      };

      const res = await fetch(`${API_BASE}/fetch-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to fetch news articles.');
      }

      const data = await res.json();
      setIngestedArticles(data.articles || []);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setIsFetchingNews(false);
    }
  };

  // Upload Custom CSV File
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFetchError('Only .csv files are supported.');
      return;
    }

    setIsUploadingCsv(true);
    setFetchError(null);
    setUploadSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload-csv`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to upload CSV');

      // Add to available CSV list if not already present
      setAvailableCsvs(prev => prev.includes(data.filename) ? prev : [data.filename, ...prev]);
      setSelectedCsv(data.filename);
      setUploadSuccessMsg(`✓ Successfully loaded ${data.filename} (${data.rows_count} articles ready)`);

      // Automatically fetch from the new CSV
      setTimeout(() => {
        handleFetchArticlesWithFile(data.filename);
      }, 250);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setIsUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clear unanalyzed pending articles from SQLite to prune storage
  const handleClearPending = async () => {
    if (!window.confirm("Remove unanalyzed pending articles from SQLite to free storage? Analyzed articles will be preserved.")) return;
    try {
      const res = await fetch(`${API_BASE}/clear-articles?status=PENDING`, { method: 'POST' });
      if (res.ok) {
        setIngestedArticles(prev => prev.filter(a => a.status === 'ANALYZED'));
      }
    } catch (err) {
      console.error('Failed to prune pending articles:', err);
    }
  };

  // Analyze a specific article from the ingested table
  const handleProcessArticle = async (article) => {
    if (article.status === 'ANALYZED') {
      alert(`Notice: This article was already analyzed and committed to the portfolio (Multiplier: ${article.analyzed_multiplier > 0 ? '+' : ''}${article.analyzed_multiplier}).\n\nDuplicate evaluation was blocked to prevent double-rebalancing.`);
      return;
    }

    setProcessingId(article.id);
    const result = await onExecuteRebalance({
      headline: article.headline,
      content: article.content || '',
      ticker_override: article.ticker || undefined,
      article_id: article.id
    });

    // Update row status in state to ANALYZED
    setIngestedArticles(prev => prev.map(a => {
      if (a.id === article.id || a.headline === article.headline) {
        return {
          ...a,
          status: 'ANALYZED',
          analyzed_multiplier: result?.final_multiplier ?? a.analyzed_multiplier
        };
      }
      return a;
    }));
    setProcessingId(null);
  };

  // Preset Scenario Click
  const handleSelectScenario = (sc) => {
    setHeadline(sc.headline);
    setTickerOverride(sc.ticker || '');
  };

  // Submit custom headline
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!headline.trim()) return;
    onExecuteRebalance({
      headline: headline.trim(),
      ticker_override: tickerOverride.trim() || undefined
    });
  };

  return (
    <div className="glass-panel glass-panel-highlight" style={{ padding: '24px', margin: '0 24px 24px 24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(247, 147, 26, 0.25), rgba(247, 147, 26, 0.05))',
            border: '1px solid rgba(247, 147, 26, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BrainCircuit size={20} color="#f7931a" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              News Feed Ingestion & AI Rebalance Hub
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Fetch breaking news from Local CSV Datasets or Live NewsAPI, then trigger FinBERT + Qwen consensus
            </p>
          </div>
        </div>

        {/* Source Mode Toggle Tabs */}
        <div className="nav-tab-container">
          <button
            type="button"
            onClick={() => setSourceMode('csv')}
            className={`nav-tab-btn ${sourceMode === 'csv' ? 'active' : ''}`}
          >
            <FileSpreadsheet size={14} />
            <span>Local CSV Dataset</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('newsapi')}
            className={`nav-tab-btn ${sourceMode === 'newsapi' ? 'active' : ''}`}
          >
            <Globe size={14} />
            <span>Live NewsAPI</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('manual')}
            className={`nav-tab-btn ${sourceMode === 'manual' ? 'active' : ''}`}
          >
            <Sparkles size={14} />
            <span>Manual Sandbox</span>
          </button>
        </div>
      </div>

      {/* INGESTION CONTROLS BOX */}
      <div style={{
        background: 'rgba(10, 10, 14, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '20px'
      }}>
        {/* OPTION 1: CSV DATASET INGESTION */}
        {sourceMode === 'csv' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  SELECT CSV DATASET (from /dataset or uploaded):
                </label>
                <select
                  value={selectedCsv}
                  onChange={(e) => setSelectedCsv(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(18, 18, 24, 0.9)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {availableCsvs.map((file) => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  BATCH LIMIT:
                </label>
                <select
                  value={csvLimit}
                  onChange={(e) => setCsvLimit(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(18, 18, 24, 0.9)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value={5}>5 Articles</option>
                  <option value={10}>10 Articles</option>
                  <option value={20}>20 Articles</option>
                  <option value={50}>50 Articles</option>
                </select>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleFetchArticles}
                  disabled={isFetchingNews || isUploadingCsv}
                  className="btn-primary"
                  style={{ padding: '10px 20px' }}
                >
                  <RefreshCw size={15} className={isFetchingNews ? 'animate-spin' : ''} />
                  <span>{isFetchingNews ? 'Loading Dataset...' : '📥 Fetch News from CSV'}</span>
                </button>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {/* Upload Custom CSV Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingCsv || isFetchingNews}
                  className="btn-secondary"
                  title="Upload a custom CSV file with headlines to ingest"
                  style={{
                    padding: '10px 18px',
                    borderColor: 'rgba(247, 147, 26, 0.45)',
                    color: '#f7931a',
                    background: 'rgba(247, 147, 26, 0.08)'
                  }}
                >
                  <Upload size={15} className={isUploadingCsv ? 'animate-spin' : ''} />
                  <span>{isUploadingCsv ? 'Uploading CSV...' : '📤 Upload Custom CSV'}</span>
                </button>
              </div>
            </div>

            {/* Upload Success Banner */}
            {uploadSuccessMsg && (
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#00e676', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* OPTION 2: LIVE NEWSAPI INGESTION */}
        {sourceMode === 'newsapi' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                NEWSAPI SEARCH QUERY:
              </label>
              <input
                type="text"
                value={newsApiQuery}
                onChange={(e) => setNewsApiQuery(e.target.value)}
                placeholder="e.g. stocks OR earnings OR inflation OR Apple"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                FROM DATE:
              </label>
              <input
                type="date"
                value={newsApiFromDate}
                min={minFromStr}
                max={newsApiToDate || yesterdayStr}
                onChange={(e) => setNewsApiFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                TO DATE (MAX: YESTERDAY):
              </label>
              <input
                type="date"
                value={newsApiToDate}
                min={newsApiFromDate || minFromStr}
                max={yesterdayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val > yesterdayStr) {
                    setNewsApiToDate(yesterdayStr);
                  } else {
                    setNewsApiToDate(val);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                ARTICLE LIMIT:
              </label>
              <select
                value={newsApiLimit}
                onChange={(e) => setNewsApiLimit(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value={5}>5 Articles</option>
                <option value={10}>10 Articles</option>
                <option value={20}>20 Articles</option>
              </select>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleFetchArticles}
                disabled={isFetchingNews}
                className="btn-primary"
                style={{ padding: '10px 22px' }}
              >
                <Globe size={15} className={isFetchingNews ? 'animate-spin' : ''} />
                <span>{isFetchingNews ? 'Querying NewsAPI...' : '🌐 Fetch Live News from NewsAPI'}</span>
              </button>
            </div>

            {/* NewsAPI 24h Restriction Notice */}
            <div style={{
              width: '100%',
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(247, 147, 26, 0.08)',
              border: '1px solid rgba(247, 147, 26, 0.2)',
              fontSize: '0.72rem',
              color: '#f7931a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span>
                <strong>NewsAPI Developer Plan Notice:</strong> Real-time articles within the last 24 hours require a paid subscription. Search is restricted between yesterday ({yesterdayStr}) and 30 days ago to prevent API errors.
              </span>
            </div>
          </div>
        )}

        {/* OPTION 3: MANUAL "WHAT-IF" SANDBOX */}
        {sourceMode === 'manual' && (
          <div>
            {/* Quick Preset Chips */}
            {sampleScenarios && sampleScenarios.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  QUICK PRESETS (CLICK TO POPULATE):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {sampleScenarios.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectScenario(sc)}
                      className="btn-secondary"
                      style={{
                        fontSize: '0.75rem',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: headline === sc.headline ? '1px solid #f7931a' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: headline === sc.headline ? 'rgba(247, 147, 26, 0.12)' : 'rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <span style={{ color: '#f7931a', fontWeight: 700 }}>{sc.ticker}:</span> {sc.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Type or paste any breaking news headline (e.g. 'Apple reports blowout earnings...')"
                style={{
                  flex: '1 1 360px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />

              <input
                type="text"
                value={tickerOverride}
                onChange={(e) => setTickerOverride(e.target.value)}
                placeholder="Ticker Override (Optional)"
                style={{
                  width: '160px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                disabled={isAnalyzing || !headline.trim()}
                className="btn-primary"
                style={{ padding: '0 20px' }}
              >
                {isAnalyzing ? <Cpu size={15} className="animate-spin" /> : <Send size={15} />}
                <span>{isAnalyzing ? 'Running Models...' : 'Analyze & Rebalance'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Error message if fetch failed */}
        {fetchError && (
          <div style={{ marginTop: '12px', color: '#ff6b8b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{fetchError}</span>
          </div>
        )}
      </div>
      {/* INGESTED ARTICLES FEED BOX */}
      <div style={{
        background: 'rgba(10, 10, 14, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '20px'
      }}>
        {/* Header row with Filter Chips */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Ingested News Feed (SQLite Tracked)
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="btn-secondary"
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    borderColor: statusFilter === 'all' ? '#f7931a' : 'rgba(255, 255, 255, 0.1)',
                    background: statusFilter === 'all' ? 'rgba(247, 147, 26, 0.15)' : 'transparent',
                    color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  All ({ingestedArticles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className="btn-secondary"
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    borderColor: statusFilter === 'pending' ? '#ffaa3b' : 'rgba(255, 255, 255, 0.1)',
                    background: statusFilter === 'pending' ? 'rgba(255, 170, 59, 0.15)' : 'transparent',
                    color: statusFilter === 'pending' ? '#ffaa3b' : 'var(--text-secondary)'
                  }}
                >
                  ● Pending ({ingestedArticles.filter(a => a.status === 'PENDING').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('analyzed')}
                  className="btn-secondary"
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    borderColor: statusFilter === 'analyzed' ? '#00e676' : 'rgba(255, 255, 255, 0.1)',
                    background: statusFilter === 'analyzed' ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
                    color: statusFilter === 'analyzed' ? '#00e676' : 'var(--text-secondary)'
                  }}
                >
                  ✓ Analyzed ({ingestedArticles.filter(a => a.status === 'ANALYZED').length})
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Deduplicated in SQLite • Analyzed articles cannot be rebalanced twice
              </span>
              {ingestedArticles.some(a => a.status === 'PENDING') && (
                <button
                  type="button"
                  onClick={handleClearPending}
                  title="Remove unanalyzed pending articles from SQLite to free storage"
                  className="btn-secondary"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    color: '#ff6b8b',
                    borderColor: 'rgba(255, 107, 139, 0.25)',
                    background: 'rgba(255, 107, 139, 0.08)'
                  }}
                >
                  <Trash2 size={11} />
                  <span>Clear Pending</span>
                </button>
              )}
            </div>
          </div>

          {ingestedArticles.length === 0 ? (
            <div style={{
              padding: '36px',
              textAlign: 'center',
              background: 'rgba(15, 15, 20, 0.4)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              No articles loaded yet. Click the <strong>"📥 Fetch News from CSV"</strong> or <strong>"🌐 Fetch Live News"</strong> button above to load articles!
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(12, 12, 16, 0.85)' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.06em',
                    position: 'sticky',
                    top: 0,
                    background: 'rgba(14, 14, 20, 0.98)',
                    zIndex: 5
                  }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>HEADLINE</th>
                    <th style={{ padding: '10px 14px' }}>TICKER</th>
                    <th style={{ padding: '10px 14px' }}>SOURCE / DATE</th>
                    <th style={{ padding: '10px 14px' }}>STATUS</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {ingestedArticles
                    .filter(a => {
                      if (statusFilter === 'pending') return a.status === 'PENDING';
                      if (statusFilter === 'analyzed') return a.status === 'ANALYZED';
                      return true;
                    })
                    .map((art) => {
                      const isRowProcessing = isAnalyzing && processingId === art.id;
                      const isAnalyzed = art.status === 'ANALYZED';
                      return (
                        <tr
                          key={art.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            fontSize: '0.82rem',
                            background: isAnalyzed ? 'rgba(0, 230, 118, 0.02)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {art.id}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#f5f5f7', fontWeight: 500, maxWidth: '380px' }}>
                            <div>{art.headline}</div>
                            {art.content && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {art.content}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {art.ticker ? (
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                background: 'rgba(247, 147, 26, 0.12)',
                                color: '#f7931a',
                                border: '1px solid rgba(247, 147, 26, 0.25)'
                              }}>
                                {art.ticker}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Auto-Detect</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div>{art.source}</div>
                            {art.datetime && <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{art.datetime}</div>}
                          </td>
                          {/* STATUS COLUMN */}
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            {isAnalyzed ? (
                              <span className="pill-badge pill-bullish" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                                <CheckCircle2 size={11} />
                                ANALYZED ({art.analyzed_multiplier != null ? (art.analyzed_multiplier > 0 ? `+${art.analyzed_multiplier}` : art.analyzed_multiplier) : 'Done'})
                              </span>
                            ) : (
                              <span className="pill-badge pill-amber" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                                <span className="pulse-dot amber"></span>
                                PENDING
                              </span>
                            )}
                          </td>
                          {/* ACTION BUTTON */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isAnalyzed ? (
                              <button
                                type="button"
                                disabled
                                className="btn-secondary"
                                title="Already analyzed and rebalanced. Duplicate processing blocked."
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '5px 12px',
                                  opacity: 0.65,
                                  cursor: 'not-allowed',
                                  color: '#00e676',
                                  borderColor: 'rgba(0, 230, 118, 0.3)',
                                  background: 'rgba(0, 230, 118, 0.05)'
                                }}
                              >
                                <CheckCircle2 size={12} />
                                <span>Rebalanced</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isAnalyzing}
                                onClick={() => handleProcessArticle(art)}
                                className="btn-secondary"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '6px 14px',
                                  borderColor: 'rgba(247, 147, 26, 0.35)',
                                  color: '#f7931a',
                                  background: 'rgba(247, 147, 26, 0.08)'
                                }}
                              >
                                {isRowProcessing ? (
                                  <>
                                    <Cpu size={13} className="animate-spin" />
                                    <span>Evaluating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={13} />
                                    <span>Analyze with Dual-AI</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* LIVE PIPELINE TELEMETRY CARD (When an article is analyzed) */}
      {latestResult && (
        <div className="glass-panel animate-fade-in" style={{
          padding: '20px',
          background: 'rgba(10, 10, 14, 0.9)',
          borderColor: latestResult.final_multiplier > 0 ? 'var(--bullish-border)' : latestResult.final_multiplier < 0 ? 'var(--bearish-border)' : 'var(--border-subtle)'
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="pill-badge pill-cyan" style={{ marginBottom: '6px' }}>
                LIVE AI EXECUTION AUDIT
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f5f5f7' }}>
                "{latestResult.headline}"
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>RESOLVED ENTITY</div>
              <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f7931a' }}>
                {latestResult.resolved_company} ({latestResult.resolved_ticker})
              </span>
            </div>
          </div>

          {/* 3 Telemetry Columns: FinBERT | Qwen2.5 | Consensus */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '16px'
          }}>
            {/* FinBERT Column */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                MODEL 1: ProsusAI FinBERT
              </div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: latestResult.finbert_score > 0 ? '#00e676' : latestResult.finbert_score < 0 ? '#ff3366' : '#8e8e9f'
              }}>
                {latestResult.finbert_score > 0 ? `+${latestResult.finbert_score}` : latestResult.finbert_score}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Domain-specific financial sentiment
              </div>
            </div>

            {/* Qwen2.5 Column */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                MODEL 2: Qwen2.5-1.5B Instruct
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: latestResult.qwen_sentiment > 0 ? '#00e676' : latestResult.qwen_sentiment < 0 ? '#ff3366' : '#8e8e9f'
                }}>
                  {latestResult.qwen_sentiment > 0 ? `+${latestResult.qwen_sentiment}` : latestResult.qwen_sentiment}
                </span>
                <span className="pill-badge pill-amber" style={{ fontSize: '0.65rem' }}>
                  Impact: {latestResult.impact_score}/10
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {latestResult.rationale ? `"${latestResult.rationale.slice(0, 70)}..."` : 'Entity & Impact reasoning'}
              </div>
            </div>

            {/* Consensus Decision Column */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                DECISION ENGINE RESULT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#f7931a'
                }}>
                  {latestResult.final_multiplier > 0 ? `+${latestResult.final_multiplier}` : latestResult.final_multiplier}
                </span>
                <span className="pill-badge pill-neutral" style={{ fontSize: '0.65rem' }}>
                  Multiplier
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {latestResult.decision_logic}
              </div>
            </div>
          </div>

          {/* Trade Execution Outcome Banner */}
          {latestResult.rebalance_result && latestResult.rebalance_result.status === 'REBALANCED' && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, rgba(247, 147, 26, 0.15), rgba(0, 230, 118, 0.1))',
              border: '1px solid rgba(247, 147, 26, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#00e676" />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    TACTICAL REBALANCE COMMITTED TO SQLITE:
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#e0e0e0', marginTop: '2px' }}>
                    Adjusted <strong>{latestResult.rebalance_result.ticker}</strong>: {latestResult.rebalance_result.old_weight_pct} <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px' }} /> <strong>{latestResult.rebalance_result.new_weight_pct}</strong> ({latestResult.rebalance_result.change_pct})
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>CASH RESERVE AFTER</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#00f0ff' }}>
                  {latestResult.rebalance_result.cash_weight_pct}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
