import { useState } from 'react'
import './App.css'
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface AnalysisResults {
  score: number
  feedback: string[]
  strengths: string[]
  improvements: string[]
  parsedText: string
  keywords: string[]
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [view, setView] = useState<'upload' | 'results'>('upload')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'parsed'>('overview')
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>({
    score: 0,
    feedback: [],
    strengths: [],
    improvements: [],
    parsedText: '',
    keywords: []
  })

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }

    return fullText
  }

  const analyzeResumeText = (text: string) => {
    // Basic keyword detection
    const keywords = [
      'JavaScript', 'TypeScript', 'React', 'Python', 'Java', 'SQL',
      'leadership', 'team', 'managed', 'developed', 'implemented',
      'increased', 'reduced', 'improved', 'achieved'
    ]

    const foundKeywords = keywords.filter(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    )

    // Check for quantifiable achievements (numbers + %)
    const hasMetrics = /\d+%|\d+\+|increased by \d+|reduced by \d+/i.test(text)
    
    // Check for action verbs
    const actionVerbs = ['developed', 'led', 'managed', 'created', 'implemented', 'designed']
    const hasActionVerbs = actionVerbs.some(verb => 
      text.toLowerCase().includes(verb.toLowerCase())
    )

    // Calculate score
    let score = 50 // base score
    score += foundKeywords.length * 3 // +3 per keyword found
    score += hasMetrics ? 15 : 0
    score += hasActionVerbs ? 10 : 0
    score = Math.min(score, 100) // cap at 100

    const strengths: string[] = []
    const improvements: string[] = []
    const feedback: string[] = []

    if (foundKeywords.length > 5) {
      strengths.push('Good use of industry-relevant keywords')
      feedback.push(`Found ${foundKeywords.length} relevant keywords`)
    } else {
      improvements.push('Add more relevant technical and soft skill keywords')
    }

    if (hasMetrics) {
      strengths.push('Includes quantifiable achievements')
    } else {
      improvements.push('Add specific numbers and metrics to showcase impact')
      feedback.push('Try adding percentages, dollar amounts, or quantities (e.g., "Increased sales by 25%")')
    }

    if (hasActionVerbs) {
      strengths.push('Uses strong action verbs')
    } else {
      improvements.push('Use more action verbs at the start of bullet points')
    }

    // Check resume length
    const wordCount = text.split(/\s+/).length
    if (wordCount < 200) {
      improvements.push('Resume seems too short - consider adding more details')
    } else if (wordCount > 800) {
      improvements.push('Resume might be too long - try to be more concise')
    } else {
      strengths.push('Good resume length')
    }

    return {
      score,
      strengths,
      improvements,
      feedback,
      keywords: foundKeywords
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
    } else {
      alert('Please upload a PDF file')
    }
  }

  const analyzeResume = async () => {
    if (!uploadedFile) return

    setIsAnalyzing(true)
    
    try {
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(uploadedFile)
      
      // Analyze the text
      const analysis = analyzeResumeText(extractedText)

      setAnalysisResults({
        ...analysis,
        parsedText: extractedText
      })

      setView('results')
    } catch (error) {
      console.error('Error analyzing resume:', error)
      alert('Failed to parse PDF. Please try another file.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (view === 'results') {
    return (
      <div className="app-container">
        {/* Navigation */}
        <nav className="navbar">
          <div className="nav-brand">
            <h2>Resuminator</h2>
          </div>
          <div className="nav-links">
            <span>ATS + Description</span>
          </div>
        </nav>

        {/* Results Page */}
        <div className="results-container">
          <aside className="sidebar">
            <div className="score-card">
              <h3>ATS Score</h3>
              <div className="score-circle">
                <span className="score-number">{analysisResults.score}</span>
                <span className="score-label">/100</span>
              </div>
              <p className="score-description">
                {analysisResults.score >= 80 ? '🎉 Excellent!' :
                 analysisResults.score >= 60 ? '👍 Good' :
                 '⚠️ Needs Work'}
              </p>
            </div>

            <div className="section">
              <h4>📊 Keywords Found</h4>
              <div className="keywords-list">
                {analysisResults.keywords.length > 0 ? (
                  analysisResults.keywords.map((keyword, idx) => (
                    <span key={idx} className="keyword-tag">{keyword}</span>
                  ))
                ) : (
                  <p className="empty-state">No keywords detected</p>
                )}
              </div>
            </div>

            <div className="section">
              <h4>💬 Ask AI</h4>
              <div className="prompt-input">
                <input type="text" placeholder="How can I improve?" />
                <button>→</button>
              </div>
            </div>

            <button className="back-btn" onClick={() => setView('upload')}>
              ← Upload New Resume
            </button>
          </aside>

          <main className="resume-viewer">
            <div className="viewer-header">
              <h3>Resume Analysis</h3>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`tab ${activeTab === 'parsed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('parsed')}
                >
                  Parsed Text
                </button>
              </div>
            </div>

            <div className="analysis-content">
              {activeTab === 'overview' ? (
                <>
                  <section className="analysis-section strengths">
                    <h4>✅ Strengths</h4>
                    <ul>
                      {analysisResults.strengths.length > 0 ? (
                        analysisResults.strengths.map((item, idx) => (
                          <li key={idx}>
                            <span className="bullet">•</span> {item}
                          </li>
                        ))
                      ) : (
                        <li className="empty-state">No strengths identified yet</li>
                      )}
                    </ul>
                  </section>

                  <section className="analysis-section improvements">
                    <h4>💡 Areas for Improvement</h4>
                    <ul>
                      {analysisResults.improvements.length > 0 ? (
                        analysisResults.improvements.map((item, idx) => (
                          <li key={idx}>
                            <span className="bullet">•</span> {item}
                          </li>
                        ))
                      ) : (
                        <li className="empty-state">Looking good! No major improvements needed.</li>
                      )}
                    </ul>
                  </section>

                  {analysisResults.feedback.length > 0 && (
                    <section className="analysis-section feedback">
                      <h4>🔍 Detailed Feedback</h4>
                      <ul>
                        {analysisResults.feedback.map((item, idx) => (
                          <li key={idx}>
                            <span className="bullet">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="file-info">
                    <p className="file-name">📄 {uploadedFile?.name}</p>
                    <p className="file-size">
                      {uploadedFile && (uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="word-count">
                      {analysisResults.parsedText.split(/\s+/).length} words extracted
                    </p>
                  </div>
                </>
              ) : (
                <section className="parsed-text-section">
                  <div className="text-controls">
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(analysisResults.parsedText)
                        alert('Text copied to clipboard!')
                      }}
                    >
                      📋 Copy Text
                    </button>
                  </div>
                  <div className="parsed-text-box">
                    {analysisResults.parsedText ? (
                      <pre>{analysisResults.parsedText}</pre>
                    ) : (
                      <p className="empty-state">No text could be extracted from the PDF</p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Upload Page
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>Resuminator</h2>
        </div>
        <div className="nav-links">
          <span>ATS + Description</span>
        </div>
      </nav>

      <main className="upload-page">
        <div className="hero-section">
          <h1>Optimize Your Resume for ATS</h1>
          <p>Upload your resume and get instant feedback on how it performs with Applicant Tracking Systems</p>
        </div>

        <div className="upload-section">
          <div className="upload-box">
            <input
              type="file"
              id="resume-upload"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="resume-upload" className="upload-label">
              {uploadedFile ? (
                <>
                  <span className="file-icon">📄</span>
                  <p className="file-name-display">{uploadedFile.name}</p>
                  <p className="file-size">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
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

          {uploadedFile && (
            <button 
              className="analyze-btn" 
              onClick={analyzeResume}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '🔄 Analyzing...' : 'Analyze Resume →'}
            </button>
          )}
        </div>

        <div className="features">
          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>ATS Score</h3>
            <p>Get a comprehensive score on how well your resume will perform</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">💡</span>
            <h3>Smart Suggestions</h3>
            <p>Receive actionable feedback to improve your resume</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🚀</span>
            <h3>Instant Results</h3>
            <p>Get your analysis in seconds, not hours</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
