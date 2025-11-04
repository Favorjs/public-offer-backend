const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

dotenv.config();

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:1010', // React dev server
      'https://tipoffer.apel.com.ng',
      'https://www.tipoffer.apel.com.ng'
    ];
    
    // Check if the origin is in the allowed list or if it's a localhost origin
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Middleware
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
// app.use('/api/auth', require('./routes/admin_auth'));
app.use('/api/public-offers', require('./routes/public_offers')); 

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Verify tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`📊 Found ${tables.length} tables in database`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Initialize database before starting server
testDatabaseConnection().then(() => {
  // Start your server here - ONLY ONE app.listen() call
  const PORT = process.env.PORT || 1000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Public offers API available at /api/public-offers`);
    console.log('✅ Mailgun client initialized');
  });
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});