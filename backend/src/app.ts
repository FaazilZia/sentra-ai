import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import { contextMiddleware } from './middleware/context.middleware';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import incidentRoutes from './routes/incident.routes';
import consentRoutes from './routes/consent.routes';
import policyRoutes from './routes/policy.routes';
import companyRoutes from './routes/company.routes';
import aiRoutes from './routes/ai.routes';
import connectorRoutes from './routes/connector.routes';
import inventoryRoutes from './routes/inventory.routes';
import driftRoutes from './routes/drift.routes';
import { apiRateLimiter } from './config/rateLimit';

const app: Application = express();

// Middleware
app.use(helmet());

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // In production, be strict. In development, allow localhost and Vercel previews.
    const isAllowed = allowedOrigins.includes(origin) || 
                      (!isProduction && (origin.endsWith('.vercel.app') || origin.includes('localhost')));
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(contextMiddleware);

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Versioned Routes (v1)
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/user', userRoutes);
v1Router.use('/incidents', incidentRoutes);
v1Router.use('/consent', consentRoutes);
v1Router.use('/policies', policyRoutes);
v1Router.use('/companies', companyRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/connectors', connectorRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/drift', driftRoutes);

// Health check under v1
v1Router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', version: 'v1' });
});

// Root of v1
v1Router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Sentra AI API v1 Operational',
    status: 'ONLINE',
    company_centric: true 
  });
});

app.use('/api/v1', v1Router);

// Legacy support (redirect /api to /api/v1 for major routes)
app.use('/api/ai', aiRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/health', (req, res) => res.redirect('/api/v1/health'));

// Root route to check version
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Sentra AI Node Backend',
    version: '1.0.0'
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
