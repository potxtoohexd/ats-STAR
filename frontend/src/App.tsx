import { useState, useEffect } from 'react'
import './App.css'
import * as pdfjsLib from 'pdfjs-dist'

// This tells Vite to package and load the worker correctly for your local development server
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker'
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

interface AnalysisResults {
  score: number
  feedback: string[]
  strengths: string[]
  improvements: string[]
  parsedText: string
  keywords: string[]
  matchedRequirements?: string[]
  missingRequirements?: string[]
  // Fields to be populated by backend (Gemini optimization)
  optimizedText?: string
  changesApplied?: { section: string; description: string }[]
  keywordsAdded?: string[]
  furtherSuggestions?: string[]
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobDescriptionImage, setJobDescriptionImage] = useState<File | null>(null)
  const [jobDescImageUrl, setJobDescImageUrl] = useState<string | null>(null)
  const [view, setView] = useState<'upload' | 'results'>('upload')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Main results tabs: Overview, Compare, Insights
  const [mainTab, setMainTab] = useState<'overview' | 'compare' | 'insights'>('overview')
  // Overview sub-tabs
  const [overviewSubTab, setOverviewSubTab] = useState<'parsed' | 'pdf' | 'optimized'>('parsed')

  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>({
    score: 0,
    feedback: [],
    strengths: [],
    improvements: [],
    parsedText: '',
    keywords: [],
    // Placeholder optimized data — backend will replace these
    optimizedText: '',
    changesApplied: [],
    keywordsAdded: [],
    furtherSuggestions: [],
  })

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
      if (jobDescImageUrl) URL.revokeObjectURL(jobDescImageUrl)
    }
  }, [fileUrl, jobDescImageUrl])

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
      pdfjsLib.GlobalWorkerOptions.workerPort = new PDFWorker()
    }
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    return fullText
  }

  const analyzeResumeText = (text: string, jobDesc: string = '') => {
    const keywords = [
      'JavaScript', 'TypeScript', 'React', 'Python', 'Java', 'SQL',
      'leadership', 'team', 'managed', 'developed', 'implemented',
      'increased', 'reduced', 'improved', 'achieved', 'Node.js',
      'Git', 'API', 'database', 'agile', 'scrum'
    ]
    const foundKeywords = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()))
    const hasMetrics = /\d+%|\d+\+|increased by \d+|reduced by \d+/i.test(text)
    const actionVerbs = ['developed', 'led', 'managed', 'created', 'implemented', 'designed']
    const hasActionVerbs = actionVerbs.some(v => text.toLowerCase().includes(v.toLowerCase()))

    let score = 50
    score += foundKeywords.length * 3
    score += hasMetrics ? 15 : 0
    score += hasActionVerbs ? 10 : 0

    const strengths: string[] = []
    const improvements: string[] = []
    const feedback: string[] = []
    let matchedRequirements: string[] = []
    let missingRequirements: string[] = []

    if (jobDesc.trim()) {
      const jobKeywords = jobDesc.toLowerCase()
      const resumeText = text.toLowerCase()
      const techTerms = ['react', 'node.js', 'python', 'java', 'javascript', 'typescript', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'rest api', 'graphql', 'ci/cd']
      techTerms.forEach(term => {
        if (jobKeywords.includes(term)) {
          if (resumeText.includes(term)) matchedRequirements.push(term)
          else missingRequirements.push(term)
        }
      })
      const jobYearsMatch = jobDesc.match(/(\d+)\+?\s*years?/i)
      const resumeYearsMatch = text.match(/(\d+)\+?\s*years?/i)
      if (jobYearsMatch && resumeYearsMatch) {
        const jobYears = parseInt(jobYearsMatch[1])
        const resumeYears = parseInt(resumeYearsMatch[1])
        if (resumeYears >= jobYears) { strengths.push(`Experience requirement met (${resumeYears}+ years)`); score += 10 }
        else improvements.push(`Job requires ${jobYears}+ years, you have ${resumeYears}+`)
      }
      if (matchedRequirements.length > 0) { score += matchedRequirements.length * 5; feedback.push(`✅ Matches ${matchedRequirements.length} job requirements`) }
      if (missingRequirements.length > 0) feedback.push(`⚠️ Missing ${missingRequirements.length} job requirements`)
    }

    score = Math.min(score, 100)
    if (foundKeywords.length > 5) { strengths.push('Good use of industry-relevant keywords'); feedback.push(`Found ${foundKeywords.length} relevant keywords`) }
    else improvements.push('Add more relevant technical and soft skill keywords')
    if (hasMetrics) strengths.push('Includes quantifiable achievements')
    else { improvements.push('Add specific numbers and metrics to showcase impact'); feedback.push('Try adding percentages, dollar amounts, or quantities (e.g., "Increased sales by 25%")') }
    if (hasActionVerbs) strengths.push('Uses strong action verbs')
    else improvements.push('Use more action verbs at the start of bullet points')
    const wordCount = text.split(/\s+/).length
    if (wordCount < 200) improvements.push('Resume seems too short - consider adding more details')
    else if (wordCount > 800) improvements.push('Resume might be too long - try to be more concise')
    else strengths.push('Good resume length')

    return { score, strengths, improvements, feedback, keywords: foundKeywords, matchedRequirements, missingRequirements }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
      if (fileUrl) URL.revokeObjectURL(fileUrl)
      setFileUrl(URL.createObjectURL(file))
    } else { alert('Please upload a PDF file') }
  }

  const handleJobDescImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setJobDescriptionImage(file)
      if (jobDescImageUrl) URL.revokeObjectURL(jobDescImageUrl)
      setJobDescImageUrl(URL.createObjectURL(file))
    } else { alert('Please upload an image file (PNG, JPG, etc.)') }
  }

  const removeJobDescImage = () => {
    if (jobDescImageUrl) URL.revokeObjectURL(jobDescImageUrl)
    setJobDescriptionImage(null)
    setJobDescImageUrl(null)
    const fileInput = document.getElementById('job-desc-image') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const analyzeResume = async () => {
    if (!uploadedFile) return
    setIsAnalyzing(true)
    try {
      const extractedText = await extractTextFromPDF(uploadedFile)
      const jobDesc = jobDescription || ''
      const analysis = analyzeResumeText(extractedText, jobDesc)
      setAnalysisResults({
        ...analysis,
        parsedText: extractedText,
        // --- BACKEND INTEGRATION POINT ---
        // Replace the fields below with actual Gemini API response data:
        // optimizedText: geminiResponse.optimizedResume,
        // changesApplied: geminiResponse.changesApplied,
        // keywordsAdded: geminiResponse.keywordsAdded,
        // furtherSuggestions: geminiResponse.furtherSuggestions,
        optimizedText: '',
        changesApplied: [],
        keywordsAdded: [],
        furtherSuggestions: [],
      })
      setView('results')
      setMainTab('overview')
    } catch (error) {
      console.error('Error analyzing resume:', error)
      alert('Failed to parse PDF. Please try another file.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ─── RESULTS VIEW ───
  if (view === 'results') {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand"><h2>Resuminator</h2></div>
          <div className="nav-links"><span>ATS + Description</span></div>
        </nav>

        <div className="results-container">
          {/* ── Sidebar ── */}
          <aside className="sidebar">
            <div className="score-card">
              <h3>ATS Score</h3>
              <div className="score-circle">
                <span className="score-number">{analysisResults.score}</span>
                <span className="score-label">/100</span>
              </div>
              <p className="score-description">
                {analysisResults.score >= 80 ? '🎉 Excellent!' : analysisResults.score >= 60 ? '👍 Good' : '⚠️ Needs Work'}
              </p>
            </div>

            <div className="section">
              <h4>📊 Keywords Found</h4>
              <div className="keywords-list">
                {analysisResults.keywords.length > 0
                  ? analysisResults.keywords.map((k, i) => <span key={i} className="keyword-tag">{k}</span>)
                  : <p className="empty-state">No keywords detected</p>}
              </div>
            </div>

            {(analysisResults.matchedRequirements?.length ?? 0) > 0 && (
              <div className="section">
                <h4>✅ Matched Requirements</h4>
                <div className="requirements-list">
                  {analysisResults.matchedRequirements?.map((r, i) => <span key={i} className="requirement-tag matched">{r}</span>)}
                </div>
              </div>
            )}

            {(analysisResults.missingRequirements?.length ?? 0) > 0 && (
              <div className="section">
                <h4>⚠️ Missing Requirements</h4>
                <div className="requirements-list">
                  {analysisResults.missingRequirements?.map((r, i) => <span key={i} className="requirement-tag missing">{r}</span>)}
                </div>
              </div>
            )}

            <div className="section">
              <h4>💬 Ask AI</h4>
              <div className="prompt-input">
                <input type="text" placeholder="'How can I improve?'" />
                <button>→</button>
              </div>
            </div>

            <button className="back-btn" onClick={() => setView('upload')}>← Upload New Resume</button>
          </aside>

          {/* ── Main viewer ── */}
          <main className="resume-viewer">
            {/* Floating pills tab bar */}
            <div className="tabs-floating" id="mainTabButtons">
              <button
                className={mainTab === 'overview' ? 'active' : ''}
                onClick={() => setMainTab('overview')}
              >Overview</button>
              <button
                className={mainTab === 'compare' ? 'active' : ''}
                onClick={() => setMainTab('compare')}
              >Compare</button>
              <button
                className={mainTab === 'insights' ? 'active' : ''}
                onClick={() => setMainTab('insights')}
              >Insights</button>
            </div>

            {/* ── OVERVIEW TAB ── */}
            {mainTab === 'overview' && (
              <div className="tab-panel">
                <div className="overview-header">
                  <div className="sub-tabs">
                    <button
                      className={`sub-tab ${overviewSubTab === 'optimized' ? 'active' : ''}`}
                      onClick={() => setOverviewSubTab('optimized')}
                    >Optimized Resume</button>
                    <button
                      className={`sub-tab ${overviewSubTab === 'parsed' ? 'active' : ''}`}
                      onClick={() => setOverviewSubTab('parsed')}
                    >View Parsed Text</button>
                    <button
                      className={`sub-tab ${overviewSubTab === 'pdf' ? 'active' : ''}`}
                      onClick={() => setOverviewSubTab('pdf')}
                    >View PDF</button>
                  </div>
                  <button
                    className="download-pdf-btn"
                    onClick={() => {
                      // --- BACKEND INTEGRATION POINT ---
                      // Replace with actual PDF download logic once backend generates optimized PDF
                      // e.g., window.open(optimizedPdfUrl, '_blank')
                      alert('Download PDF: Connect to backend endpoint that returns the Gemini-optimized resume as a PDF.')
                    }}
                  >⬇ Download PDF</button>
                </div>

                <div className="overview-label">Optimized résumé</div>

                {overviewSubTab === 'parsed' && (
                  <section className="parsed-text-section">
                    <div className="text-controls">
                      <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(analysisResults.optimizedText || analysisResults.parsedText); alert('Copied!') }}>
                        📋 Copy Text
                      </button>
                    </div>
                    <div className="parsed-text-box">
                      {/* --- BACKEND INTEGRATION POINT ---
                          Replace analysisResults.optimizedText with the Gemini-optimized resume text.
                          Falls back to parsedText if optimizedText is empty (pre-backend state). */}
                      {(analysisResults.optimizedText || analysisResults.parsedText) ? (
                        <pre>{analysisResults.optimizedText || analysisResults.parsedText}</pre>
                      ) : (
                        <p className="empty-state">No text extracted. Run analysis first.</p>
                      )}
                    </div>
                  </section>
                )}

                {overviewSubTab === 'optimized' && (
                  <section className="parsed-text-section">
                    <div className="parsed-text-box">
                      {analysisResults.optimizedText ? (
                        <pre>{analysisResults.optimizedText}</pre>
                      ) : (
                        <div className="empty-state">
                          Optimized resume content is not available yet. Connect the backend and populate <code>analysisResults.optimizedText</code> to show this view.
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {overviewSubTab === 'pdf' && (
                  <section className="pdf-view-panel">
                    {fileUrl ? (
                      <iframe src={fileUrl} title="Resume PDF" className="pdf-iframe" />
                    ) : (
                      <p className="empty-state">No PDF loaded.</p>
                    )}
                  </section>
                )}
              </div>
            )}

            {/* ── COMPARE TAB ── */}
            {mainTab === 'compare' && (
              <div className="tab-panel">
                <div className="compare-header">
                  <span className="compare-title">Diff View — Original vs Optimized</span>
                  <span className="compare-hint">Red = removed &nbsp;·&nbsp; Green = added</span>
                </div>

                {/* --- BACKEND INTEGRATION POINT ---
                    Replace the placeholder paragraphs below with actual diff data from Gemini.
                    Suggested shape:
                      diffLines: Array<{ type: 'removed' | 'added' | 'unchanged'; text: string }>
                    Map over diffLines and render each as a <div className={`diff-line diff-${line.type}`}>
                */}
                <div className="compare-pane-wrapper">
                  <div className="compare-pane">
                    <div className="compare-pane-label original">Original</div>
                    <div className="diff-content">
                      {analysisResults.parsedText ? (
                        analysisResults.parsedText.split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="diff-line diff-unchanged">{line}</div>
                        ))
                      ) : (
                        <p className="empty-state">No original text available.</p>
                      )}
                    </div>
                  </div>

                  <div className="compare-pane">
                    <div className="compare-pane-label optimized">Optimized</div>
                    <div className="diff-content">
                      {/* BACKEND: swap this block for actual optimized diff lines */}
                      {analysisResults.optimizedText ? (
                        analysisResults.optimizedText.split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="diff-line diff-added">{line}</div>
                        ))
                      ) : (
                        <div className="compare-placeholder">
                          <div className="placeholder-icon">⚙️</div>
                          <p className="placeholder-title">Optimized resume will appear here</p>
                          <p className="placeholder-sub">
                            Connect the Gemini backend endpoint and populate{' '}
                            <code>analysisResults.optimizedText</code> to see the diff.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INSIGHTS TAB ── */}
            {mainTab === 'insights' && (
              <div className="tab-panel">
                {/* --- BACKEND INTEGRATION POINT ---
                    The Strengths, Areas for Improvement, and Detailed Feedback sections
                    are already wired to analysisResults.strengths / .improvements / .feedback.
                    After Gemini integration, also populate:
                      analysisResults.changesApplied  → [ { section, description } ]
                      analysisResults.keywordsAdded   → string[]
                      analysisResults.furtherSuggestions → string[]
                    The UI below will automatically render them once those arrays are non-empty.
                */}
                <div className="insights-grid">
                  <section className="analysis-section strengths">
                    <h4>✅ Strengths</h4>
                    <ul>
                      {analysisResults.strengths.length > 0
                        ? analysisResults.strengths.map((item, i) => <li key={i}><span className="bullet">•</span> {item}</li>)
                        : <li className="empty-state">No strengths identified yet.</li>}
                    </ul>
                  </section>

                  <section className="analysis-section improvements">
                    <h4>💡 Areas for Improvement</h4>
                    <ul>
                      {analysisResults.improvements.length > 0
                        ? analysisResults.improvements.map((item, i) => <li key={i}><span className="bullet">•</span> {item}</li>)
                        : <li className="empty-state">Looking good! No major improvements needed.</li>}
                    </ul>
                  </section>

                  {analysisResults.feedback.length > 0 && (
                    <section className="analysis-section feedback">
                      <h4>🔍 Detailed Feedback</h4>
                      <ul>
                        {analysisResults.feedback.map((item, i) => <li key={i}><span className="bullet">•</span> {item}</li>)}
                      </ul>
                    </section>
                  )}

                  {/* Further Suggestions — from Gemini */}
                  {(analysisResults.furtherSuggestions?.length ?? 0) > 0 && (
                    <section className="analysis-section further-suggestions">
                      <h4>🚀 Further Suggestions</h4>
                      <ul>
                        {analysisResults.furtherSuggestions?.map((item, i) => <li key={i}><span className="bullet">•</span> {item}</li>)}
                      </ul>
                    </section>
                  )}

                  {/* Keywords Added — from Gemini */}
                  {(analysisResults.keywordsAdded?.length ?? 0) > 0 && (
                    <section className="analysis-section keywords-added-section">
                      <h4>🏷 Keywords Added</h4>
                      <div className="keywords-list">
                        {analysisResults.keywordsAdded?.map((k, i) => <span key={i} className="keyword-tag keyword-added">{k}</span>)}
                      </div>
                    </section>
                  )}

                  {/* Placeholder shown only when backend hasn't connected yet */}
                  {(analysisResults.furtherSuggestions?.length ?? 0) === 0 && (analysisResults.keywordsAdded?.length ?? 0) === 0 && (
                    <section className="analysis-section insights-placeholder">
                      <h4>🤖 AI-Powered Insights</h4>
                      <div className="placeholder-block">
                        <div className="placeholder-icon">🔗</div>
                        <p className="placeholder-title">Backend not yet connected</p>
                        <p className="placeholder-sub">
                          Once the Gemini endpoint is hooked up, populate{' '}
                          <code>furtherSuggestions</code> and <code>keywordsAdded</code>{' '}
                          in <code>analysisResults</code> to surface richer AI insights here.
                        </p>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  }

  // ─── UPLOAD VIEW (unchanged) ───
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand"><h2>Resuminator</h2></div>
        <div className="nav-links"><span>ATS + Description</span></div>
      </nav>

      <main className="upload-page">
        <div className="hero-section">
          <h1>Optimize Your Resume for ATS</h1>
          <p>Upload your resume and get instant feedback on how it performs with Applicant Tracking Systems</p>
        </div>

        <div className="upload-section">
          <div className="upload-box">
            <input type="file" id="resume-upload" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            <label htmlFor="resume-upload" className="upload-label">
              {uploadedFile ? (
                <>
                  <span className="file-icon">📄</span>
                  <p className="file-name-display">{uploadedFile.name}</p>
                  <p className="file-size">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  <p className="change-file">Click to change file</p>
                </>
              ) : (
                <>
                  <span className="upload-icon">⬆️</span>
                  <p>Click to upload or drag and drop</p>
                  <p className="upload-hint">PDF files only (Max 10MB)</p>
                </>
              )}
            </label>
          </div>

          <div className="job-description-input">
            <label htmlFor="job-description">
              <strong>Optional:</strong> Provide Job Description for Tailored Feedback
            </label>
            <div className="job-desc-flex-container">
              <div className="job-desc-column">
                <textarea id="job-description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="E.g., 'Looking for a Software Engineer with 3+ years experience in React and Node.js, strong knowledge of REST APIs, Git, and Agile methodologies...'"
                  rows={6} />
              </div>
              <div className="or-divider"><span>OR</span></div>
              <div className="job-desc-column">
                <div className="image-upload-box">
                  <input type="file" id="job-desc-image" accept="image/*" onChange={handleJobDescImageUpload} style={{ display: 'none' }} />
                  <label htmlFor="job-desc-image" className="image-upload-label">
                    {jobDescriptionImage ? (
                      <>
                        <span className="file-icon">🖼️</span>
                        <p className="file-name-display">{jobDescriptionImage.name}</p>
                        {jobDescImageUrl && <img src={jobDescImageUrl} alt="Job Description" className="preview-image" />}
                        <p className="change-file">Click to change image</p>
                        <button type="button" className="remove-image-btn" onClick={(e) => { e.preventDefault(); removeJobDescImage() }}>✕ Remove Image</button>
                      </>
                    ) : (
                      <>
                        <span className="upload-icon">📸</span>
                        <p>Upload Screenshot of Job Description</p>
                        <p className="upload-hint">PNG, JPG, or any image format</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
            {jobDescriptionImage && (
              <p className="feature-note">ℹ️ <strong>Note:</strong> Image OCR support coming soon! For now, please paste the text above.</p>
            )}
          </div>

          {uploadedFile && (
            <button className="analyze-btn" onClick={analyzeResume} disabled={isAnalyzing}>
              {isAnalyzing ? '🔄 Analyzing...' : 'Analyze Resume →'}
            </button>
          )}
        </div>

        <div className="features">
          <div className="feature-card"><span className="feature-icon">🎯</span><h3>ATS Score</h3><p>Get a comprehensive score on how well your resume will perform</p></div>
          <div className="feature-card"><span className="feature-icon">💡</span><h3>Smart Suggestions</h3><p>Receive actionable feedback to improve your resume</p></div>
          <div className="feature-card"><span className="feature-icon">🚀</span><h3>Instant Results</h3><p>Get your analysis in seconds, not hours</p></div>
        </div>
      </main>
    </div>
  )
}

export default App
