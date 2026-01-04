import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';

// Routes
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import clientParameterRoutes from './routes/client-parameters';
import portfolioRoutes from './routes/portfolios';
import companyRoutes from './routes/companies';
import parameterRoutes from './routes/parameters';
import criteriaSetRoutes from './routes/criteria-sets';
import screeningRoutes from './routes/screening';
import importRoutes from './routes/import';
import adminRoutes from './routes/admin';

const app = express();

// CORS configuration - allow multiple origins
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  // GitHub Pages (add your actual GitHub Pages URL here)
  'https://per007.github.io',
];

// Add FRONTEND_URL from environment if specified
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || origin === allowed)) {
      return callback(null, true);
    }
    
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/clients', clientParameterRoutes); // Handles /clients/:clientId/parameters
app.use('/', portfolioRoutes); // Handles /clients/:clientId/portfolios and /portfolios/:id
app.use('/companies', companyRoutes);
app.use('/parameters', parameterRoutes);
app.use('/criteria-sets', criteriaSetRoutes);
app.use('/', screeningRoutes); // Handles /screen and /screening-results
app.use('/import', importRoutes); // Handles /import/portfolios/:clientId, /import/validate, /import/template
app.use('/admin', adminRoutes); // Handles /admin/stats, /admin/reset, /admin/* delete endpoints (admin only)

// Error handling
app.use(errorHandler);

export default app;
