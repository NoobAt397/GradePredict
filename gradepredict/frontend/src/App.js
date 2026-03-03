import React, { useState, useRef } from 'react';

const API_URL = '';

const GRADE_COLORS = {
  A: '#3d9e6b',
  B: '#5b9e8a',
  C: '#c9a84c',
  D: '#c07a30',
  F: '#c0392b',
};

const SAMPLE_RUBRIC = [
  { name: 'Content & Accuracy', max_score: 40, description: 'Demonstrates understanding of the topic with accurate information' },
  { name: 'Organization', max_score: 30, description: 'Clear structure with introduction, body, and conclusion' },
  { name: 'Grammar & Style', max_score: 30, description: 'Proper grammar, spelling, and appropriate writing style' },
];

const SAMPLE_ESSAY = `The Water Cycle: Nature's Recycling System

The water cycle is one of the most important processes on Earth. It describes how water moves continuously between the Earth's surface and the atmosphere.

The cycle begins with evaporation. When the sun heats water in oceans, lakes, and rivers, some of it turns into water vapor and rises into the air. Plants also release water vapor through a process called transpiration.

As water vapor rises higher into the atmosphere, it cools down and condenses into tiny water droplets. These droplets form clouds through a process called condensation. When the droplets combine and become heavy enough, they fall back to Earth as precipitation - rain, snow, sleet, or hail.

Once precipitation reaches the ground, it can take several paths. Some water flows over the surface as runoff, eventually reaching streams, rivers, and oceans. Some seeps into the ground and becomes groundwater, which can be stored in aquifers for thousands of years.

The water cycle is essential for life on Earth. It distributes fresh water around the planet, supports ecosystems, and helps regulate climate. Without this continuous cycle, life as we know it would not be possible.`;

function PdfIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="loading-text">
      Grading
      <span className="dots">
        <span>·</span>
        <span>·</span>
        <span>·</span>
      </span>
    </span>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('manual');
  const [rubric, setRubric] = useState([]);
  const [extractedCount, setExtractedCount] = useState(null);

  // PDF state
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Manual entry
  const [criterionName, setCriterionName] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [description, setDescription] = useState('');

  // Assignment & results
  const [assignmentText, setAssignmentText] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const handlePdfFile = (file) => {
    if (!file || file.type !== 'application/pdf') {
      setPdfError('Please upload a valid PDF file.');
      return;
    }
    setPdfFileName(file.name);
    setPdfError('');
    setPdfLoading(true);
    setExtractedCount(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      try {
        const response = await fetch(`${API_URL}/api/parse-rubric`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf_base64: base64 }),
        });
        const data = await response.json();
        if (data.success) {
          setRubric(data.criteria);
          setExtractedCount(data.criteria.length);
        } else {
          setPdfError(data.error || 'Failed to extract rubric.');
        }
      } catch (err) {
        setPdfError('Failed to connect: ' + err.message);
      } finally {
        setPdfLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handlePdfFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => {
    if (e.target.files[0]) handlePdfFile(e.target.files[0]);
  };

  const addCriterion = () => {
    if (!criterionName.trim() || !maxScore || !description.trim()) return;
    setRubric([...rubric, {
      name: criterionName.trim(),
      max_score: parseInt(maxScore, 10),
      description: description.trim(),
    }]);
    setCriterionName('');
    setMaxScore('');
    setDescription('');
  };

  const removeCriterion = (i) => setRubric(rubric.filter((_, idx) => idx !== i));

  const loadSampleData = () => {
    setRubric(SAMPLE_RUBRIC);
    setAssignmentText(SAMPLE_ESSAY);
    setExtractedCount(null);
    setResults(null);
    setError('');
  };

  const gradeAssignment = async () => {
    if (rubric.length === 0) { setError('Add at least one rubric criterion.'); return; }
    if (!assignmentText.trim()) { setError('Enter the assignment text.'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const response = await fetch(`${API_URL}/api/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_text: assignmentText, rubric }),
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.result);
      } else {
        setError(data.error || 'Grading failed.');
      }
    } catch (err) {
      setError('Failed to connect: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = rubric.reduce((s, c) => s + c.max_score, 0);
  const gradeColor = results ? (GRADE_COLORS[results.letter_grade] || '#c9a84c') : '#c9a84c';

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header fade-in">
        <h1 className="wordmark">RUBRIQ</h1>
        <p className="tagline">AI grading. Ruthlessly precise.</p>
        <div className="header-rule" />
      </header>

      {/* SECTION 1 — RUBRIC */}
      <section className="card fade-in delay-1">
        <span className="section-label">01 — Rubric</span>
        <h2 className="section-title">Build Your Rubric</h2>

        <div className="tab-group">
          <button
            className={`tab${activeTab === 'pdf' ? ' tab-active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            Upload PDF
          </button>
          <button
            className={`tab${activeTab === 'manual' ? ' tab-active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Entry
          </button>
        </div>

        {/* PDF Upload Mode */}
        {activeTab === 'pdf' && (
          <div
            className={`drop-zone${isDragging ? ' drop-zone-active' : ''}${pdfLoading ? ' drop-zone-loading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !pdfLoading && fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            {pdfLoading ? (
              <>
                <span className="pdf-icon pulse"><PdfIcon /></span>
                <p className="drop-text">{pdfFileName}</p>
                <p className="drop-subtext">Extracting rubric&hellip;</p>
              </>
            ) : pdfError ? (
              <>
                <span className="pdf-icon" style={{ color: 'var(--error)' }}>✕</span>
                <p className="drop-text" style={{ color: 'var(--error)' }}>{pdfError}</p>
                <p className="drop-subtext">Click to try again</p>
              </>
            ) : pdfFileName ? (
              <>
                <span className="pdf-icon"><PdfIcon /></span>
                <p className="drop-text" style={{ color: 'var(--gold)' }}>{pdfFileName}</p>
                <p className="drop-subtext">Click to replace</p>
              </>
            ) : (
              <>
                <span className="pdf-icon"><PdfIcon /></span>
                <p className="drop-text">Drop rubric PDF here</p>
                <p className="drop-subtext">or click to browse</p>
              </>
            )}
          </div>
        )}

        {/* Manual Entry Mode */}
        {activeTab === 'manual' && (
          <div className="input-group">
            <input
              className="input input-name"
              type="text"
              placeholder="Criterion name"
              value={criterionName}
              onChange={(e) => setCriterionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
            />
            <input
              className="input input-pts"
              type="number"
              placeholder="Max pts"
              value={maxScore}
              min="1"
              onChange={(e) => setMaxScore(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
            />
            <input
              className="input input-desc"
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
            />
            <button className="btn-add" onClick={addCriterion}>Add</button>
          </div>
        )}

        {/* Shared criteria list */}
        {rubric.length > 0 && (
          <div className="criteria-list">
            {extractedCount !== null && (
              <p className="extracted-note">{extractedCount} criteria extracted from PDF</p>
            )}
            {rubric.map((c, i) => (
              <div key={i} className="criterion-row">
                <span className="crit-name">{c.name}</span>
                <span className="pts-badge">{c.max_score} pts</span>
                <span className="crit-desc">{c.description}</span>
                <button className="btn-remove" onClick={() => removeCriterion(i)}>×</button>
              </div>
            ))}
            <div className="total-row">
              Total: <span className="total-pts">{totalPoints} pts</span>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2 — ASSIGNMENT */}
      <section className="card fade-in delay-2">
        <span className="section-label">02 — Assignment</span>
        <h2 className="section-title">Enter Assignment</h2>

        <textarea
          className="textarea"
          placeholder="Paste the student's assignment text here…"
          value={assignmentText}
          onChange={(e) => setAssignmentText(e.target.value)}
          rows={10}
        />
        <button className="sample-link" onClick={loadSampleData}>
          Load sample essay
        </button>
        <button
          className={`btn-grade${loading ? ' btn-grade-loading' : ''}`}
          onClick={gradeAssignment}
          disabled={loading}
        >
          {loading ? <LoadingDots /> : 'Grade with Rubriq'}
        </button>
        {error && <div className="error-box">{error}</div>}
      </section>

      {/* SECTION 3 — RESULTS */}
      {results && (
        <section
          className="card results-card fade-in"
          style={{ '--grade-color': gradeColor }}
        >
          <span className="section-label">03 — Results</span>
          <h2 className="section-title">Grading Results</h2>

          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Score</span>
              <span className="stat-value">{results.total_score} / {results.total_possible}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Percentage</span>
              <span className="stat-value">{results.percentage}%</span>
            </div>
            <div className="stat-card stat-card-grade">
              <span className="stat-label">Grade</span>
              <span className="stat-value grade-letter" style={{ color: gradeColor }}>
                {results.letter_grade}
              </span>
            </div>
          </div>

          {results.criteria_scores && results.criteria_scores.length > 0 && (
            <div className="breakdown">
              <h3 className="breakdown-heading">Breakdown</h3>
              {results.criteria_scores.map((c, i) => (
                <div key={i} className="breakdown-item" style={{ '--delay': `${i * 100}ms` }}>
                  <div className="breakdown-header">
                    <span className="breakdown-name">{c.criterion_name}</span>
                    <span className="breakdown-score">{c.score} / {c.max_score}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ '--target-width': `${Math.min((c.score / c.max_score) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="breakdown-reasoning">{c.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="footer fade-in delay-3">
        <span className="footer-wordmark">RUBRIQ</span>
      </footer>

    </div>
  );
}

export default App;
