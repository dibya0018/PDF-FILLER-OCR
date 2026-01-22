import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import formFillingRoutes from './routes/formFilling.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
await fs.ensureDir('./uploads');

// Routes
app.use('/api', formFillingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF Form Filler API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Key configured: ${process.env.DATALAB_API_KEY ? 'Yes' : 'No'}`);
});
