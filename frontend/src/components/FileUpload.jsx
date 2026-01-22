import React, { useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFilesSelected }) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [dataFile, setDataFile] = useState(null);
  const [dataType, setDataType] = useState('csv'); // 'csv' or 'pdf'
  const [dragActive, setDragActive] = useState({ pdf: false, data: false });
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'text'
  const [manualText, setManualText] = useState('');

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive({ ...dragActive, [type]: true });
    } else if (e.type === 'dragleave') {
      setDragActive({ ...dragActive, [type]: false });
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive({ ...dragActive, [type]: false });

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (type === 'pdf') {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          setPdfFile(file);
        } else {
          alert('Please select a PDF file');
        }
      } else if (type === 'data') {
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const isPDF = file.name.toLowerCase().endsWith('.pdf');
        
        if (isCSV || isPDF) {
          setDataFile(file);
          setDataType(isCSV ? 'csv' : 'pdf');
        } else {
          alert('Please select a CSV or PDF file');
        }
      }
    }
  };

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'pdf') {
        setPdfFile(file);
      } else if (type === 'data') {
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        setDataFile(file);
        setDataType(isCSV ? 'csv' : 'pdf');
      }
    }
  };

  const handleSubmit = () => {
    if (inputMode === 'file') {
      if (pdfFile && dataFile) {
        onFilesSelected(pdfFile, dataFile, dataType, 'file');
      } else {
        alert('Please select both PDF form and data file (CSV or PDF)');
      }
    } else {
      if (pdfFile && manualText.trim()) {
        onFilesSelected(pdfFile, manualText, 'text', 'text');
      } else {
        alert('Please select PDF form and enter data text');
      }
    }
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'file' ? 'text' : 'file');
    // Clear data when switching modes
    setDataFile(null);
    setManualText('');
  };

  return (
    <div className="file-upload-container">
      <h2>Step 1: Upload Files</h2>
      
      <div className="upload-grid">
        {/* PDF Upload */}
        <div className="upload-section">
          <h3>PDF Form</h3>
          <div
            className={`drop-zone ${dragActive.pdf ? 'drag-active' : ''} ${pdfFile ? 'has-file' : ''}`}
            onDragEnter={(e) => handleDrag(e, 'pdf')}
            onDragLeave={(e) => handleDrag(e, 'pdf')}
            onDragOver={(e) => handleDrag(e, 'pdf')}
            onDrop={(e) => handleDrop(e, 'pdf')}
            onClick={() => document.getElementById('pdf-input').click()}
          >
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'pdf')}
              style={{ display: 'none' }}
            />
            {pdfFile ? (
              <div className="file-info">
                <div className="file-icon">PDF</div>
                <div className="file-name">{pdfFile.name}</div>
                <div className="file-size">{(pdfFile.size / 1024).toFixed(2)} KB</div>
              </div>
            ) : (
              <>
                <div className="upload-icon">PDF</div>
                <p>Drag and drop PDF here</p>
                <p className="upload-hint">or click to browse</p>
              </>
            )}
          </div>
        </div>

        {/* Data Upload (CSV or PDF) or Manual Text Input */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Data Source</h3>
            <button 
              type="button"
              className="toggle-mode-btn" 
              onClick={toggleInputMode}
              title={`Switch to ${inputMode === 'file' ? 'Manual Text' : 'File Upload'} mode`}
            >
              {inputMode === 'file' ? 'Switch to Text Input' : 'Switch to File Upload'}
            </button>
          </div>

          {inputMode === 'file' ? (
            <div
              className={`drop-zone ${dragActive.data ? 'drag-active' : ''} ${dataFile ? 'has-file' : ''}`}
              onDragEnter={(e) => handleDrag(e, 'data')}
              onDragLeave={(e) => handleDrag(e, 'data')}
              onDragOver={(e) => handleDrag(e, 'data')}
              onDrop={(e) => handleDrop(e, 'data')}
              onClick={() => document.getElementById('data-input').click()}
            >
              <input
                id="data-input"
                type="file"
                accept=".csv,.pdf"
                onChange={(e) => handleFileChange(e, 'data')}
                style={{ display: 'none' }}
              />
              {dataFile ? (
                <div className="file-info">
                  <div className="file-icon">{dataType.toUpperCase()}</div>
                  <div className="file-name">{dataFile.name}</div>
                  <div className="file-size">{(dataFile.size / 1024).toFixed(2)} KB</div>
                </div>
              ) : (
                <>
                  <div className="upload-icon">DATA</div>
                  <p>Drag and drop CSV or PDF here</p>
                  <p className="upload-hint">or click to browse</p>
                </>
              )}
            </div>
          ) : (
            <div className="text-input-section">
              <textarea
                className="data-text-input"
                placeholder="Enter your data here in key-value format:&#10;&#10;Name: John Doe&#10;Email: john@example.com&#10;Phone: 555-0123&#10;Address: 123 Main St&#10;City: New York&#10;&#10;Or paste any formatted text..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={12}
              />
              <div className="text-input-hint">
                Tip: Use "Key: Value" format for best results. Each field on a new line.
              </div>
              {manualText.trim() && (
                <div className="text-input-stats">
                  {manualText.split('\n').filter(line => line.trim()).length} lines entered
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="upload-actions">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!pdfFile || (inputMode === 'file' ? !dataFile : !manualText.trim())}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default FileUpload;
