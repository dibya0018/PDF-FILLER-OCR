import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import CsvPreview from './components/CsvPreview';
import PdfViewer from './components/PdfViewer';
import { uploadFiles, parseCSV, parsePDF, parseText, fillForm, getDownloadUrl, getPreviewUrl } from './services/api';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // File data
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [dataType, setDataType] = useState('csv'); // 'csv' or 'pdf'
  const [csvData, setCsvData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState(null);
  
  // Result data
  const [filledPdfFilename, setFilledPdfFilename] = useState(null);
  const [fieldsFilledCount, setFieldsFilledCount] = useState(0);

  const handleFilesSelected = async (pdfFile, dataFile, fileDataType, inputMode) => {
    setLoading(true);
    setError(null);
    
    try {
      let parsedResult;
      
      if (inputMode === 'text') {
        // Handle manual text input
        console.log('Processing manual text input');
        
        // Create a FormData and upload only the PDF
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        
        const response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload PDF');
        }
        
        const uploadResult = await response.json();
        setUploadedFiles(uploadResult.files);
        setDataType('text');
        
        // Parse the text directly
        parsedResult = await parseText(dataFile); // dataFile is actually the text string
        
        // Store the text data for later use
        sessionStorage.setItem('manualTextData', dataFile);
        
      } else {
        // Handle file upload (CSV or PDF)
        const uploadResult = await uploadFiles(pdfFile, dataFile, fileDataType);
        setUploadedFiles(uploadResult.files);
        setDataType(uploadResult.dataType);
        
        // Parse data based on type
        if (uploadResult.dataType === 'csv') {
          parsedResult = await parseCSV(uploadResult.files.csv.path);
        } else {
          parsedResult = await parsePDF(uploadResult.files.dataPdf.path);
        }
      }
      
      setCsvData(parsedResult.data);
      setFieldMappings(parsedResult.fieldMappings);
      
      // Move to next step
      setStep(2);
    } catch (err) {
      console.error('Error processing data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process data');
    } finally {
      setLoading(false);
    }
  };

  const handleRowSelected = async (rowIndex, context) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get data based on type
      let dataPath;
      
      if (dataType === 'text') {
        // Get text data from session storage
        dataPath = sessionStorage.getItem('manualTextData');
      } else if (dataType === 'csv') {
        dataPath = uploadedFiles.csv.path;
      } else {
        dataPath = uploadedFiles.dataPdf.path;
      }
      
      // Fill form
      const fillResult = await fillForm(
        uploadedFiles.pdf.path,
        dataPath,
        dataType,
        rowIndex,
        context,
        fieldMappings
      );
      
      setFilledPdfFilename(fillResult.filledPdfFilename);
      setFieldsFilledCount(fillResult.fieldsFilledCount);
      
      // Move to next step
      setStep(3);
    } catch (err) {
      console.error('Error filling form:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fill form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl = getDownloadUrl(filledPdfFilename);
    window.open(downloadUrl, '_blank');
  };

  const handleStartOver = () => {
    setStep(1);
    setUploadedFiles(null);
    setDataType('csv');
    setCsvData(null);
    setFieldMappings(null);
    setFilledPdfFilename(null);
    setFieldsFilledCount(0);
    setError(null);
    // Clear session storage
    sessionStorage.removeItem('manualTextData');
  };

  const handleBackToUpload = () => {
    setStep(1);
    setError(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>PDF FILLER</h1>
        <button className="dark-mode-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {darkMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
      </header>

      <main className="main-content">
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">{step > 1 ? '✓' : '1'}</div>
            <div className="step-label">Upload Files</div>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">{step > 2 ? '✓' : '2'}</div>
            <div className="step-label">Select Data</div>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Preview & Download</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Processing... Please wait</p>
          </div>
        )}

        {/* Step Content */}
        {!loading && (
          <>
            {step === 1 && (
              <FileUpload onFilesSelected={handleFilesSelected} />
            )}

            {step === 2 && csvData && (
              <CsvPreview
                csvData={csvData}
                fieldMappings={fieldMappings}
                onRowSelected={handleRowSelected}
                onBack={handleBackToUpload}
              />
            )}

            {step === 3 && filledPdfFilename && (
              <PdfViewer
                pdfUrl={getPreviewUrl(filledPdfFilename)}
                title="Your filled PDF is ready!"
                onDownload={handleDownload}
                onBack={handleStartOver}
                fieldsFilledCount={fieldsFilledCount}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
