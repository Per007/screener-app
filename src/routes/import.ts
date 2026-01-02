/**
 * Import Routes
 * 
 * This module provides API endpoints for importing portfolio data from files.
 * 
 * Endpoints:
 * - POST /api/import/portfolios/:clientId - Import a portfolio CSV file
 * - POST /api/import/validate - Validate a CSV file without importing
 * - GET /api/import/template - Download a sample CSV template
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../models/types';
import { 
  importPortfolioFromCSV, 
  validatePortfolioCSV, 
  generateCSVTemplate 
} from '../services/import.service';

const router = Router();

// Configure multer for file uploads
// We use memory storage to keep the file in a buffer (no disk writes)
// This is appropriate for reasonably-sized CSV files (< 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
    files: 1                    // Only 1 file at a time
  },
  fileFilter: (req, file, callback) => {
    // Only accept CSV files
    // Check both the mimetype and file extension
    const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.csv', '.txt'];
    
    const ext = file.originalname.toLowerCase().slice(-4);
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = allowedExtensions.some(e => file.originalname.toLowerCase().endsWith(e));
    
    if (isValidMime || isValidExt) {
      callback(null, true);  // Accept the file
    } else {
      callback(new Error('Only CSV files are allowed'));
    }
  }
});

// Validation schema for import options
const importOptionsSchema = z.object({
  portfolioName: z.string().min(1, 'Portfolio name is required'),
  createMissingCompanies: z.boolean().optional().default(true),
  createMissingParameters: z.boolean().optional().default(true),
  updateExistingValues: z.boolean().optional().default(true),
  holdingsMode: z.enum(['replace', 'merge']).optional().default('replace'),
  asOfDate: z.string().datetime().optional(),
  source: z.string().optional()
});

/**
 * POST /api/import/portfolios/:clientId
 * 
 * Import a portfolio from a CSV file for a specific client.
 * 
 * The CSV file should have the following structure:
 * - Required column: "Company Name" or "CompanyName"
 * - Optional columns: "Ticker", "Sector", "Weight", "Shares"
 * - Additional columns are treated as parameter values
 * 
 * Form data:
 * - file: The CSV file (multipart/form-data)
 * - portfolioName: Name for the new portfolio
 * - createMissingCompanies: Whether to create companies that don't exist (default: true)
 * - createMissingParameters: Whether to create parameters that don't exist (default: true)
 * - updateExistingValues: Whether to update existing parameter values (default: true)
 * - asOfDate: The date for parameter values (default: current date)
 * - source: Source identifier for the import
 */
router.post(
  '/portfolios/:clientId',
  authenticate,
  upload.single('file'),  // 'file' is the field name in the form
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        throw new AppError('No file uploaded. Please provide a CSV file in the "file" field.', 400);
      }
      
      // Parse and validate options from request body
      // Note: When using multipart/form-data, body fields come as strings
      const options = importOptionsSchema.parse({
        portfolioName: req.body.portfolioName,
        createMissingCompanies: req.body.createMissingCompanies === 'true' || req.body.createMissingCompanies === true,
        createMissingParameters: req.body.createMissingParameters === 'true' || req.body.createMissingParameters === true,
        updateExistingValues: req.body.updateExistingValues === 'true' || req.body.updateExistingValues === true,
        holdingsMode: req.body.holdingsMode || 'replace',
        asOfDate: req.body.asOfDate,
        source: req.body.source
      });
      
      const clientId = req.params.clientId;
      
      // Perform the import
      const result = await importPortfolioFromCSV(
        req.file.buffer,
        options.portfolioName,
        clientId,
        {
          createMissingCompanies: options.createMissingCompanies,
          createMissingParameters: options.createMissingParameters,
          updateExistingValues: options.updateExistingValues,
          holdingsMode: options.holdingsMode,
          asOfDate: options.asOfDate ? new Date(options.asOfDate) : undefined,
          source: options.source
        }
      );
      
      // Return appropriate status based on result
      if (result.success) {
        res.status(201).json({
          message: 'Portfolio imported successfully',
          ...result
        });
      } else {
        res.status(400).json({
          message: 'Import failed',
          ...result
        });
      }
    } catch (err) {
      // Handle multer errors specifically
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Maximum size is 10 MB.', 400));
        }
        return next(new AppError(`File upload error: ${err.message}`, 400));
      }
      next(err);
    }
  }
);

/**
 * POST /api/import/validate
 * 
 * Validate a CSV file without actually importing it.
 * Useful for previewing what will be imported and checking for errors.
 * 
 * Form data:
 * - file: The CSV file to validate
 * 
 * Returns:
 * - isValid: Whether the file passed validation
 * - rowCount: Number of data rows found
 * - columns: List of column names in the file
 * - errors: Any validation errors found
 */
router.post(
  '/validate',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded. Please provide a CSV file in the "file" field.', 400);
      }
      
      const result = await validatePortfolioCSV(req.file.buffer);
      
      res.json({
        message: result.isValid ? 'File is valid and ready for import' : 'File has validation errors',
        ...result
      });
    } catch (err) {
      if (err instanceof multer.MulterError) {
        return next(new AppError(`File upload error: ${err.message}`, 400));
      }
      next(err);
    }
  }
);

/**
 * GET /api/import/template
 * 
 * Download a sample CSV template file.
 * This helps users understand the expected format for portfolio imports.
 * 
 * Query parameters:
 * - includeExamples: Whether to include example data rows (default: true)
 */
router.get(
  '/template',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const includeExamples = req.query.includeExamples !== 'false';
      const csv = generateCSVTemplate(includeExamples);
      
      // Set headers to trigger file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="portfolio-template.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

