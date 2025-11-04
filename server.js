const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

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


async function initializeDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Checking database tables...');
    
    // Test if tables exist by querying a table
    await prisma.adminUsers.findFirst();
    console.log('✅ Database tables already exist');
    
  } catch (error) {
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('📋 Tables not found. Creating tables...');
      
      // Push schema to create tables
      const { execSync } = require('child_process');
      execSync('npx prisma db push', { stdio: 'inherit' });
      
      console.log('✅ Tables created successfully!');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Initialize database before starting server
initializeDatabase().then(() => {
  // Start your server here
  const PORT = process.env.PORT || 1000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});
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

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Public offers API available at /api/public-offers`);
});