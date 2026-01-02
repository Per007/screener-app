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

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
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

// Error handling
app.use(errorHandler);

export default app;
