import fs from 'fs-extra';
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const PDFParser = require('pdf2json');

/**
 * Extract data from a filled PDF using multiple methods
 * 1. Try to extract form fields (for fillable PDFs)
 * 2. Try pdf2json for structured data extraction
 * 3. Try text extraction
 * 4. Use OCR for handwritten/scanned PDFs
 */
export const extractPDFData = async (pdfPath) => {
  try {
    console.log('Reading PDF file:', pdfPath);
    
    // Method 1: Try to extract form fields using pdf-lib
    const formFields = await extractFormFields(pdfPath);
    if (Object.keys(formFields).length > 0) {
      console.log('✅ Extracted form fields:', Object.keys(formFields).length);
      return {
        success: true,
        fields: formFields,
        fieldCount: Object.keys(formFields).length,
        method: 'form-fields'
      };
    }
    
    // Method 2: Try pdf2json for structured extraction
    const structuredData = await extractWithPdf2Json(pdfPath);
    if (Object.keys(structuredData).length > 5) { // At least 5 fields to consider success
      console.log('✅ Extracted with pdf2json:', Object.keys(structuredData).length);
      return {
        success: true,
        fields: structuredData,
        fieldCount: Object.keys(structuredData).length,
        method: 'pdf2json'
      };
    }
    
    // Method 3: Fall back to text extraction
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('PDF parsed with text extraction. Text length:', pdfData.text.length);
    
    if (pdfData.text.length > 50) { // If significant text found
      const fields = parseFieldsFromText(pdfData.text);
      if (Object.keys(fields).length > 5) {
        console.log('✅ Extracted with text parsing:', Object.keys(fields).length);
        return {
          success: true,
          fields: fields,
          fieldCount: Object.keys(fields).length,
          rawText: pdfData.text,
          method: 'text-extraction'
        };
      }
    }
    
    // Method 4: Use Datalab OCR for handwritten/scanned PDFs
    // Note: This requires API key to be passed from the route
    console.log('⚠️ Text extraction methods failed. Attempting Datalab OCR for handwritten/scanned content...');
    console.log('   Note: OCR requires Datalab API key. Make sure to pass apiKey parameter to parsePDF()');
    
    // Return empty for now - OCR will be triggered from route level with API key
    // The route will need to handle handwritten PDFs differently
    
    // If all methods fail, return empty but don't error
    console.log('⚠️ No data could be extracted from PDF');
    return {
      success: true,
      fields: {},
      fieldCount: 0,
      method: 'none',
      message: 'Could not extract data. PDF may be empty, encrypted, or have unrecognizable format.'
    };
    
  } catch (error) {
    console.error('Error reading PDF:', error.message);
    throw new Error(`PDF read error: ${error.message}`);
  }
};

/**
 * Extract form field values from a fillable PDF
 */
async function extractFormFields(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const extractedFields = {};
    
    for (const field of fields) {
      const fieldName = field.getName();
      let fieldValue = '';
      
      try {
        // Try different field types
        if (field.constructor.name === 'PDFTextField') {
          fieldValue = field.getText() || '';
        } else if (field.constructor.name === 'PDFCheckBox') {
          fieldValue = field.isChecked() ? 'Yes' : 'No';
        } else if (field.constructor.name === 'PDFRadioGroup') {
          fieldValue = field.getSelected() || '';
        } else if (field.constructor.name === 'PDFDropdown') {
          const selected = field.getSelected();
          fieldValue = selected ? selected.join(', ') : '';
        }
        
        if (fieldValue && fieldValue.trim() !== '') {
          extractedFields[fieldName] = fieldValue.trim();
        }
      } catch (err) {
        console.log(`Could not extract value for field ${fieldName}`);
      }
    }
    
    return extractedFields;
  } catch (error) {
    console.log('Form field extraction failed:', error.message);
    return {};
  }
}

/**
 * Extract data using pdf2json library
 */
function extractWithPdf2Json(pdfPath) {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    const fields = {};
    
    pdfParser.on('pdfParser_dataError', errData => {
      console.log('pdf2json error:', errData.parserError);
      resolve({});
    });
    
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        // Extract text items from all pages
        const pages = pdfData.Pages || [];
        
        for (const page of pages) {
          const texts = page.Texts || [];
          
          // Group nearby text items as potential field-value pairs
          for (let i = 0; i < texts.length - 1; i++) {
            const currentText = decodeURIComponent(texts[i].R[0].T);
            const nextText = decodeURIComponent(texts[i + 1].R[0].T);
            
            // If current text looks like a label (ends with :) and next is value
            if (currentText.trim().endsWith(':') && nextText.trim().length > 0) {
              const fieldName = currentText.replace(':', '').trim();
              fields[fieldName] = nextText.trim();
            } else if (currentText.trim().length > 2 && nextText.trim().length > 0) {
              // Store as potential field-value pair
              fields[currentText.trim()] = nextText.trim();
            }
          }
        }
        
        resolve(fields);
      } catch (err) {
        console.log('pdf2json parsing error:', err.message);
        resolve({});
      }
    });
    
    pdfParser.loadPDF(pdfPath);
  });
}

/**
 * Extract data using Datalab API's OCR capabilities
 * This method uses Datalab's 'read' endpoint which can handle handwritten/scanned PDFs
 * Note: This requires a valid Datalab API key
 */
async function extractWithOCR(pdfPath, apiKey) {
  try {
    // If no API key provided, skip OCR
    if (!apiKey) {
      console.log('⚠️ No API key provided for OCR extraction. Skipping.');
      return {};
    }
    
    console.log('Starting Datalab OCR extraction...');
    
    // Import axios for API calls
    const axios = require('axios');
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(pdfPath));
    formData.append('extract_mode', 'all'); // Extract all possible data
    
    // Use Datalab's fill endpoint with empty field_data to just read the PDF
    const response = await axios.post(
      'https://www.datalab.to/api/v1/fill',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': apiKey
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    
    console.log('Datalab read request initiated:', response.data.request_id);
    
    // Poll for completion
    const requestId = response.data.request_id;
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const statusResponse = await axios.get(
        `https://www.datalab.to/api/v1/fill/${requestId}`,
        {
          headers: {
            'X-API-Key': apiKey
          }
        }
      );
      
      console.log(`OCR poll attempt ${attempts + 1}/${maxAttempts}, status: ${statusResponse.data.status}`);
      
      if (statusResponse.data.status === 'complete' || statusResponse.data.status === 'completed') {
        // Extract any fields that were detected
        const detectedFields = statusResponse.data.fields_filled || statusResponse.data.detected_fields || [];
        const fields = {};
        
        // Convert detected fields to our format
        if (Array.isArray(detectedFields)) {
          detectedFields.forEach(field => {
            if (field.name && field.value) {
              fields[field.name] = field.value;
            } else if (typeof field === 'object') {
              // Handle different field formats
              Object.entries(field).forEach(([key, value]) => {
                if (value && typeof value === 'string') {
                  fields[key] = value;
                }
              });
            }
          });
        } else if (typeof detectedFields === 'object') {
          Object.assign(fields, detectedFields);
        }
        
        console.log(`✅ Datalab OCR completed. Fields detected: ${Object.keys(fields).length}`);
        return fields;
      } else if (statusResponse.data.status === 'failed' || statusResponse.data.status === 'error') {
        console.log('❌ Datalab OCR failed:', statusResponse.data.error);
        return {};
      }
      
      attempts++;
    }
    
    console.log('⚠️ Datalab OCR timed out');
    return {};
    
  } catch (error) {
    console.error('Datalab OCR extraction failed:', error.message);
    return {};
  }
}

/**
 * Parse field-value pairs from PDF text
 * This tries to extract structured data from the text content
 */
function parseFieldsFromText(text) {
  const fields = {};
  
  // Split by lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Common patterns for field-value pairs in PDFs
  const patterns = [
    /^(.+?):\s*(.+)$/,           // "Field Name: Value"
    /^(.+?)\s{2,}(.+)$/,         // "Field Name  Value" (multiple spaces)
    /^([A-Z][A-Za-z\s]+)\s+(.+)$/ // "Field Name Value"
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && match[2]) {
        const fieldName = match[1].trim();
        const fieldValue = match[2].trim();
        
        // Skip very short field names or values that might be noise
        if (fieldName.length > 1 && fieldValue.length > 0) {
          fields[fieldName] = fieldValue;
        }
        break;
      }
    }
  }
  
  // If no structured fields found, try to extract any meaningful data
  if (Object.keys(fields).length === 0) {
    // Extract potential data points (words/phrases that look like data)
    const dataPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:\-]?\s*([A-Z0-9][A-Za-z0-9\s,.-]+)/g;
    let match;
    let index = 0;
    
    while ((match = dataPattern.exec(text)) !== null && index < 50) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value && !fields[key]) {
        fields[key] = value;
        index++;
      }
    }
  }
  
  return fields;
}

/**
 * Convert extracted PDF data to the same format as CSV rows
 * This allows compatibility with existing form filling logic
 */
export const convertExtractedDataToRows = (extractedFields) => {
  // Convert the extracted fields object into an array of row objects
  // Each key-value pair becomes a column in the row
  const row = {};
  
  for (const [key, value] of Object.entries(extractedFields)) {
    // Handle both simple values and complex field objects
    if (typeof value === 'object' && value !== null && 'value' in value) {
      row[key] = value.value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      row[key] = value;
    } else {
      row[key] = String(value);
    }
  }
  
  return {
    headers: Object.keys(row),
    rows: [row], // Single row with the extracted data
    rowCount: 1
  };
};

/**
 * Parse a filled PDF and return structured data similar to CSV format
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} apiKey - Datalab API key (optional, needed for OCR on handwritten PDFs)
 */
export const parsePDF = async (pdfPath, apiKey = null) => {
  try {
    // First try standard extraction methods
    const result = await extractPDFData(pdfPath);
    
    console.log('Extracted fields:', result.fields);
    console.log('Field count:', result.fieldCount);
    
    // If no fields extracted and we have an API key, try Datalab OCR
    if (result.fieldCount === 0 && apiKey) {
      console.log('🔄 Attempting Datalab API OCR for handwritten/scanned content...');
      const ocrFields = await extractWithOCR(pdfPath, apiKey);
      
      if (Object.keys(ocrFields).length > 0) {
        console.log('✅ OCR extraction successful:', Object.keys(ocrFields).length, 'fields');
        const structuredData = convertExtractedDataToRows(ocrFields);
        return {
          success: true,
          data: structuredData,
          extractedFieldCount: Object.keys(ocrFields).length,
          method: 'datalab-ocr'
        };
      }
    }
    
    // Convert to CSV-like format
    const structuredData = convertExtractedDataToRows(result.fields);
    
    return {
      success: true,
      data: structuredData,
      extractedFieldCount: result.fieldCount,
      method: result.method
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};
