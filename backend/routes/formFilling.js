import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { parseCSV, convertRowToFieldData, generateFieldMappings } from '../services/csvParser.js';
import { fillPDFForm, pollAndDownloadPDF } from '../services/datalabService.js';
import { parsePDF } from '../services/pdfParser.js';
import { parseText, generateTextFieldMappings } from '../services/textParser.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads';
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for PDF field'));
      }
    } else if (file.fieldname === 'csv') {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed for CSV field'));
      }
    } else if (file.fieldname === 'dataPdf') {
      // PDF file used as data source (filled PDF)
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for data PDF field'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/upload
 * Upload PDF and CSV/PDF files
 * Supports three modes:
 * 1. PDF form + CSV data
 * 2. PDF form + PDF data (extracts data from filled PDF)
 * 3. PDF form only (for manual text input mode)
 */
router.post('/upload', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'csv', maxCount: 1 },
  { name: 'dataPdf', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'PDF form file is required' });
    }

    const pdfFile = req.files.pdf[0];
    
    // Check if this is text input mode (no data files)
    if (!req.files.csv && !req.files.dataPdf) {
      // Text input mode - only PDF uploaded
      return res.json({
        success: true,
        files: {
          pdf: {
            filename: pdfFile.filename,
            originalName: pdfFile.originalname,
            path: pdfFile.path,
            size: pdfFile.size
          }
        },
        dataType: 'text'
      });
    }

    const dataFile = req.files.csv ? req.files.csv[0] : req.files.dataPdf[0];
    const dataType = req.files.csv ? 'csv' : 'pdf';

    const response = {
      success: true,
      files: {
        pdf: {
          filename: pdfFile.filename,
          originalName: pdfFile.originalname,
          path: pdfFile.path,
          size: pdfFile.size
        }
      },
      dataType: dataType
    };

    // Add data file info based on type
    if (dataType === 'csv') {
      response.files.csv = {
        filename: dataFile.filename,
        originalName: dataFile.originalname,
        path: dataFile.path,
        size: dataFile.size
      };
    } else {
      response.files.dataPdf = {
        filename: dataFile.filename,
        originalName: dataFile.originalname,
        path: dataFile.path,
        size: dataFile.size
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/parse-csv
 * Parse CSV file and return data preview
 */
router.post('/parse-csv', async (req, res) => {
  try {
    const { csvPath } = req.body;

    if (!csvPath) {
      return res.status(400).json({ error: 'CSV path is required' });
    }

    const csvData = await parseCSV(csvPath);
    const fieldMappings = generateFieldMappings(csvData.headers);

    res.json({
      success: true,
      data: csvData,
      fieldMappings: fieldMappings
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/parse-pdf
 * Parse filled PDF file and extract data
 */
router.post('/parse-pdf', async (req, res) => {
  try {
    const { pdfPath } = req.body;

    if (!pdfPath) {
      return res.status(400).json({ error: 'PDF path is required' });
    }

    // Get API key from environment
    const apiKey = process.env.DATALAB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'DATALAB_API_KEY not configured' });
    }

    const pdfData = await parsePDF(pdfPath, apiKey);
    const fieldMappings = generateFieldMappings(pdfData.data.headers);

    res.json({
      success: true,
      data: pdfData.data,
      fieldMappings: fieldMappings,
      extractedFieldCount: pdfData.extractedFieldCount
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/parse-text
 * Parse manual text input and extract field-value pairs
 */
router.post('/parse-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text data is required' });
    }

    console.log('Parsing manual text input, length:', text.length);

    const textData = parseText(text);
    const fieldMappings = generateTextFieldMappings(textData.headers);

    res.json({
      success: true,
      data: textData,
      fieldMappings: fieldMappings,
      extractedFieldCount: textData.headers.length
    });
  } catch (error) {
    console.error('Text parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fill-form
 * Fill PDF form with selected CSV/PDF/Text row data
 * Supports CSV, PDF, and manual text data sources
 */
router.post('/fill-form', async (req, res) => {
  try {
    const { pdfPath, csvPath, dataPdfPath, textData, rowIndex, context, customMappings } = req.body;

    if (!pdfPath) {
      return res.status(400).json({ error: 'PDF path is required' });
    }

    if (!csvPath && !dataPdfPath && !textData) {
      return res.status(400).json({ error: 'Either CSV path, data PDF path, or text data is required' });
    }

    if (rowIndex === undefined) {
      return res.status(400).json({ error: 'Row index is required' });
    }

    let parsedData;
    let selectedRow;

    // Parse data based on source type
    if (textData) {
      // Parse manual text input
      console.log('Using manual text input');
      parsedData = parseText(textData);
    } else if (csvPath) {
      // Parse CSV
      console.log('Using CSV file');
      parsedData = await parseCSV(csvPath);
    } else {
      // Parse PDF
      console.log('Using PDF file');
      const apiKey = process.env.DATALAB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'DATALAB_API_KEY not configured' });
      }
      const pdfResult = await parsePDF(dataPdfPath, apiKey);
      parsedData = pdfResult.data;
    }

    if (rowIndex < 0 || rowIndex >= parsedData.rows.length) {
      return res.status(400).json({ error: 'Invalid row index' });
    }

    // Get the selected row
    selectedRow = parsedData.rows[rowIndex];

    // Convert to field data format
    const fieldData = convertRowToFieldData(selectedRow, customMappings);

    console.log('Processing form fill for row:', rowIndex);
    console.log('Field data:', fieldData);

    // Get API key from environment
    const apiKey = process.env.DATALAB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'DATALAB_API_KEY not configured' });
    }

    // Call Datalab API
    const fillResult = await fillPDFForm(pdfPath, fieldData, context || '', apiKey);

    console.log('Form fill initiated:', fillResult);

    // Generate output path
    const outputFilename = `filled-${Date.now()}.pdf`;
    const outputPath = path.join('./uploads', outputFilename);

    // Poll for completion and download
    const result = await pollAndDownloadPDF(fillResult.requestId, outputPath, apiKey);

    res.json({
      success: true,
      filledPdfPath: outputPath,
      filledPdfFilename: outputFilename,
      fieldsFilledCount: result.fieldsFilledCount,
      requestId: fillResult.requestId
    });

  } catch (error) {
    console.error('Form filling error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/download/:filename
 * Download filled PDF
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./uploads', filename);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/preview/:filename
 * Preview PDF file
 */
router.get('/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./uploads', filename);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.contentType('application/pdf');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
