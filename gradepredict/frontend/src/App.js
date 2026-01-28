import React, { useState } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
  // Rubric state
  const [rubric, setRubric] = useState([]);
  const [criterionName, setCriterionName] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [description, setDescription] = useState('');

  // Assignment state
  const [assignmentText, setAssignmentText] = useState('');

  // Results state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addCriterion = () => {
    if (!criterionName || !maxScore || !description) {
      alert('Please fill in all criterion fields');
      return;
    }
    setRubric([
      ...rubric,
      {
        name: criterionName,
        max_score: parseInt(maxScore),
        description: description,
      },
    ]);
    setCriterionName('');
    setMaxScore('');
    setDescription('');
  };

  const removeCriterion = (index) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  const gradeAssignment = async () => {
    if (rubric.length === 0) {
      setError('Please add at least one rubric criterion');
      return;
    }
    if (!assignmentText.trim()) {
      setError('Please enter assignment text');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`${API_URL}/api/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_text: assignmentText,
          rubric: rubric,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.result);
      } else {
        setError(data.error || 'Grading failed');
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>GradePredict</h1>
        <p>AI-Powered Assignment Grading</p>
      </header>

      <main>
        {/* Section 1: Rubric Builder */}
        <section className="section rubric-builder">
          <h2>1. Build Your Rubric</h2>
          <div className="criterion-form">
            <input
              type="text"
              placeholder="Criterion name (e.g., Content)"
              value={criterionName}
              onChange={(e) => setCriterionName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Max points"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              min="1"
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button onClick={addCriterion} className="btn-add">
              Add Criterion
            </button>
          </div>

          {rubric.length > 0 && (
            <div className="rubric-list">
              <h3>Rubric Criteria:</h3>
              {rubric.map((criterion, index) => (
                <div key={index} className="criterion-item">
                  <div className="criterion-info">
                    <strong>{criterion.name}</strong>
                    <span className="points">{criterion.max_score} pts</span>
                    <p>{criterion.description}</p>
                  </div>
                  <button
                    onClick={() => removeCriterion(index)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="total-points">
                Total: {rubric.reduce((sum, c) => sum + c.max_score, 0)} points
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Assignment Input */}
        <section className="section assignment-input">
          <h2>2. Enter Assignment</h2>
          <textarea
            placeholder="Paste the student's assignment text here..."
            value={assignmentText}
            onChange={(e) => setAssignmentText(e.target.value)}
            rows={10}
          />
          <button
            onClick={gradeAssignment}
            disabled={loading}
            className="btn-grade"
          >
            {loading ? 'Grading...' : 'Grade Now'}
          </button>
          {error && <div className="error">{error}</div>}
        </section>

        {/* Section 3: Results Display */}
        {results && (
          <section className="section results">
            <h2>3. Grading Results</h2>

            <div className="grade-summary">
              <div className="grade-box">
                <span className="label">Total Score</span>
                <span className="value">
                  {results.total_score} / {results.total_possible}
                </span>
              </div>
              <div className="grade-box">
                <span className="label">Percentage</span>
                <span className="value">{results.percentage}%</span>
              </div>
              <div className="grade-box letter">
                <span className="label">Letter Grade</span>
                <span className="value">{results.letter_grade}</span>
              </div>
            </div>

            <div className="criteria-results">
              <h3>Detailed Breakdown:</h3>
              {results.criteria_scores &&
                results.criteria_scores.map((criterion, index) => (
                  <div key={index} className="criterion-result">
                    <div className="criterion-header">
                      <span className="name">{criterion.criterion_name}</span>
                      <span className="score">
                        {criterion.score} / {criterion.max_score}
                      </span>
                    </div>
                    <p className="reasoning">{criterion.reasoning}</p>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
