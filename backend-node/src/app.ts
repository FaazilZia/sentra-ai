import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import incidentRoutes from './routes/incident.routes';
import consentRoutes from './routes/consent.routes';
import policyRoutes from './routes/policy.routes';
import tenantRoutes from './routes/tenant.routes';
import aiRoutes from './routes/ai.routes';
import connectorRoutes from './routes/connector.routes';
import { apiRateLimiter } from './config/rateLimit';

const app: Application = express();

// Middleware
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (like mobile apps or curl), allow it
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or Vercel patterns
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.includes('localhost');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/connectors', connectorRoutes);

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'healthy', message: 'Server is healthy' });
});

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
