# PDF Form Filler with CSV Data

An intelligent PDF form filling application that uses CSV data and Datalab API to automatically fill PDF forms with AI-powered field matching.

## Features

- 📤 **Drag & Drop Upload**: Easy file upload for PDF forms and CSV data
- 📊 **CSV Data Preview**: View and select which row of data to use
- 🤖 **Smart Field Mapping**: AI-powered matching of CSV columns to PDF form fields
- 👀 **PDF Preview**: Preview the filled PDF before downloading
- 📥 **One-Click Download**: Download the filled PDF instantly

## Technology Stack

### Backend
- Node.js with Express
- Datalab API for form filling
- CSV parsing with PapaParse
- File handling with Multer

### Frontend
- React with Vite
- React-PDF for PDF viewing
- Axios for API calls
- Modern CSS with responsive design

## Prerequisites

- Node.js (v16 or higher)
- Datalab API key

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```
DATALAB_API_KEY=your_api_key_here
PORT=5000
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm start
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Upload Files**
   - Drag and drop or click to upload a PDF form
   - Drag and drop or click to upload a CSV file with data

2. **Select CSV Row**
   - View all rows from your CSV file in a table
   - Select the row you want to use for filling the form
   - Preview how CSV columns map to PDF fields
   - Optionally add context to improve field matching

3. **Preview & Download**
   - View the filled PDF with zoom and navigation controls
   - Download the filled PDF with one click

## CSV Data Format

Your CSV file should have headers that describe the data. Example:

```csv
title,surname,name,street,number,postcode,city,country,iban,swift,currency
Mr.,Smith,John,Main Street,123,94102,San Francisco,USA,GB82WEST12345698765432,DEUTDEFF,USD
```

The application will automatically match column headers to PDF form fields using intelligent mapping.

## API Endpoints

### Backend API

- `POST /api/upload` - Upload PDF and CSV files
- `POST /api/parse-csv` - Parse CSV and return data
- `POST /api/fill-form` - Fill PDF form with CSV data
- `GET /api/download/:filename` - Download filled PDF
- `GET /api/preview/:filename` - Preview PDF file

## Field Mapping

The application uses smart field mapping to match CSV columns to PDF fields:

- **Exact matches**: `surname` → "SURNAME"
- **Semantic matches**: `last_name` → "Surname or Last Name"
- **Fuzzy matches**: `zip` → "Postal Code"

Common field patterns are automatically recognized:
- Names (first, last, full, title)
- Address fields (street, number, city, postal code, country)
- Bank details (IBAN, SWIFT, account number, routing number)

## Example CSV Fields for Bank Details Form

```csv
title,surname,name,address,number,postcode,town,country,iban,swift,currency,bank_name,bank_address,bank_city,bank_country
```

## Project Structure

```
project-root/
├── backend/
│   ├── services/
│   │   ├── csvParser.js        # CSV parsing and field mapping
│   │   └── datalabService.js   # Datalab API integration
│   ├── routes/
│   │   └── formFilling.js      # API routes
│   ├── server.js               # Express server
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx  # File upload component
│   │   │   ├── CsvPreview.jsx  # CSV data preview
│   │   │   └── PdfViewer.jsx   # PDF preview component
│   │   ├── services/
│   │   │   └── api.js          # API client
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── data-set/
    └── Bank-details-form.pdf   # Sample PDF form
```

## Troubleshooting

### Backend Issues

- **API Key Error**: Make sure `DATALAB_API_KEY` is set in `.env` file
- **File Upload Error**: Check that `uploads/` directory exists and has write permissions
- **Port Already in Use**: Change the PORT in `.env` file

### Frontend Issues

- **PDF Not Loading**: Make sure the backend server is running
- **CORS Error**: Check that CORS is enabled in backend server
- **PDF.js Worker Error**: The worker is loaded from CDN, check internet connection

## License

ISC

## Credits

- Form filling powered by [Datalab API](https://www.datalab.to/)
- PDF viewing by [react-pdf](https://github.com/wojtekmaj/react-pdf)
