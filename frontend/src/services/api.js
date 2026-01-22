import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Upload PDF and CSV/PDF files
 * @param {File} pdfFile - The PDF form template
 * @param {File} dataFile - CSV or PDF data file
 * @param {string} dataType - 'csv' or 'pdf'
 */
export const uploadFiles = async (pdfFile, dataFile, dataType = 'csv') => {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  
  if (dataType === 'csv') {
    formData.append('csv', dataFile);
  } else {
    formData.append('dataPdf', dataFile);
  }

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Parse CSV file
 */
export const parseCSV = async (csvPath) => {
  const response = await axios.post(`${API_BASE_URL}/parse-csv`, {
    csvPath,
  });

  return response.data;
};

/**
 * Parse filled PDF file
 */
export const parsePDF = async (pdfPath) => {
  const response = await axios.post(`${API_BASE_URL}/parse-pdf`, {
    pdfPath,
  });

  return response.data;
};

/**
 * Parse manual text input
 */
export const parseText = async (text) => {
  const response = await axios.post(`${API_BASE_URL}/parse-text`, {
    text,
  });

  return response.data;
};

/**
 * Fill PDF form with CSV/PDF/Text data
 * @param {string} pdfPath - Path to PDF form template
 * @param {string} dataPath - Path to CSV or PDF data file, OR text data string
 * @param {string} dataType - 'csv', 'pdf', or 'text'
 * @param {number} rowIndex - Row index to use
 * @param {string} context - Optional context
 * @param {object} customMappings - Optional field mappings
 */
export const fillForm = async (pdfPath, dataPath, dataType, rowIndex, context = '', customMappings = null) => {
  const requestBody = {
    pdfPath,
    rowIndex,
    context,
    customMappings,
  };

  if (dataType === 'csv') {
    requestBody.csvPath = dataPath;
  } else if (dataType === 'pdf') {
    requestBody.dataPdfPath = dataPath;
  } else if (dataType === 'text') {
    requestBody.textData = dataPath; // dataPath is actually the text string in this case
  }

  const response = await axios.post(`${API_BASE_URL}/fill-form`, requestBody);

  return response.data;
};

/**
 * Get download URL for filled PDF
 */
export const getDownloadUrl = (filename) => {
  return `${API_BASE_URL}/download/${filename}`;
};

/**
 * Get preview URL for PDF
 */
export const getPreviewUrl = (filename) => {
  return `${API_BASE_URL}/preview/${filename}`;
};
