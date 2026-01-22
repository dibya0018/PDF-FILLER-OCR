import React, { useState } from 'react';
import './CsvPreview.css';

const CsvPreview = ({ csvData, fieldMappings, onRowSelected, onBack }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [context, setContext] = useState('');

  const handleRowSelect = (index) => {
    setSelectedRow(index);
  };

  const handleSubmit = () => {
    if (selectedRow !== null) {
      onRowSelected(selectedRow, context);
    } else {
      alert('Please select a row from the CSV data');
    }
  };

  return (
    <div className="csv-preview-container">
      <h2>Step 2: Select CSV Row</h2>
      <p className="subtitle">Choose which row of data to use for filling the form</p>

      {/* CSV Data Table */}
      <div className="table-container">
        <table className="csv-table">
          <thead>
            <tr>
              <th className="select-column">Select</th>
              {csvData.headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvData.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={selectedRow === rowIndex ? 'selected' : ''}
                onClick={() => handleRowSelect(rowIndex)}
              >
                <td className="select-column">
                  <input
                    type="radio"
                    name="csv-row"
                    checked={selectedRow === rowIndex}
                    onChange={() => handleRowSelect(rowIndex)}
                  />
                </td>
                {csvData.headers.map((header, colIndex) => (
                  <td key={colIndex}>{row[header] || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Field Mappings Preview */}
      {selectedRow !== null && (
        <div className="field-mappings">
          <h3>Field Mappings Preview</h3>
          <p className="mappings-hint">The following fields will be sent to the PDF form:</p>
          <div className="mappings-grid">
            {Object.entries(csvData.rows[selectedRow]).map(([key, value]) => {
              if (value && value.toString().trim() !== '') {
                return (
                  <div key={key} className="mapping-item">
                    <div className="mapping-source">
                      <span className="mapping-label">CSV Column:</span>
                      <span className="mapping-value">{key}</span>
                    </div>
                    <div className="mapping-arrow">to</div>
                    <div className="mapping-target">
                      <span className="mapping-label">PDF Field:</span>
                      <span className="mapping-value">{fieldMappings[key.toLowerCase().replace(/\s+/g, '_')] || key}</span>
                    </div>
                    <div className="mapping-data">
                      <span className="mapping-label">Value:</span>
                      <span className="mapping-value data-value">{value}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* Optional Context */}
      <div className="context-input">
        <label htmlFor="context">
          <strong>Context (Optional):</strong>
          <span className="context-hint">Provide additional context to help with field matching</span>
        </label>
        <input
          id="context"
          type="text"
          placeholder="e.g., Bank account details for new employee"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="csv-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={selectedRow === null}
        >
          Fill Form
        </button>
      </div>
    </div>
  );
};

export default CsvPreview;
