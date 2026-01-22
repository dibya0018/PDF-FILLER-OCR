import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PdfViewer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfViewer = ({ pdfUrl, title, onDownload, onBack, fieldsFilledCount }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  return (
    <div className="pdf-viewer-container">
      <h2>Step 3: Preview & Download</h2>
      <p className="subtitle">{title}</p>

      {fieldsFilledCount !== undefined && (
        <div className="success-message">
          Successfully filled {fieldsFilledCount} field{fieldsFilledCount !== 1 ? 's' : ''} in the PDF
        </div>
      )}

      {/* PDF Controls */}
      <div className="pdf-controls">
        <div className="control-group">
          <button className="control-btn" onClick={zoomOut} disabled={scale <= 0.5}>
            Zoom Out
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="control-btn" onClick={zoomIn} disabled={scale >= 2.0}>
            Zoom In
          </button>
        </div>

        <div className="control-group">
          <button className="control-btn" onClick={goToPrevPage} disabled={pageNumber <= 1}>
            Previous
          </button>
          <span className="page-info">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <button className="control-btn" onClick={goToNextPage} disabled={pageNumber >= numPages}>
            Next
          </button>
        </div>
      </div>

      {/* PDF Display */}
      <div className="pdf-display">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          }
          error={
            <div className="error-message">
              Failed to load PDF. Please try again.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Actions */}
      <div className="pdf-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          Start Over
        </button>
        <button className="btn btn-success" onClick={onDownload}>
          Download Filled PDF
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;
