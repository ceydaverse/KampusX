// backend/index.ts
// ⚠️ EN ÜSTE: dotenv'i diğer tüm importlardan önce yükle
import "dotenv/config";

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { getPool } from './db';
import questionsRoutes from './routes/questions.routes';
import categoriesRoutes from './routes/categories.routes';
import groupsRoutes from './routes/groups.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import answersRoutes from './routes/answers.routes';
import dmRoutes from './routes/dm.routes';
import notificationsRoutes from './routes/notifications.routes';
import followsRoutes from './routes/follows.routes';
import searchRoutes from './routes/search.routes';

//const app = express();

// Frontend portuna CORS izni
//app.use(
  //cors({
   // origin: 'http://localhost:5174',
 // })
//);//

//app.use(express.json());//
const app = express();

// CORS ayarı - frontend origin'lerini belirt
const FRONTEND_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(cors({
  origin: FRONTEND_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

// Body parsing - kesin olsun
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




const PORT = Number(process.env.PORT || 5001);

// PORT log'u ekle
console.log(`🔧 Backend PORT=${PORT} (env: ${process.env.PORT || 'default'})`);

// HTTP Server oluştur (Socket.IO için)
const httpServer = createServer(app);

// Socket.IO setup - CORS ayarı Express ile aynı
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Socket.IO instance'ı export et (DM controller'da kullanmak için)
export { io };

// Socket.IO instance'ını realtime.ts'ye set et (servislerden erişilebilir yap)
import { setIO } from './socket/realtime';
setIO(io);

// Socket.IO handlers setup
import { setupSocketAuth, setupSocketHandlers } from './socket/dm.socket';
setupSocketAuth(io);
setupSocketHandlers(io);

// ------------------------
//  TEST ENDPOINTLER
// ------------------------

app.get('/', (req: Request, res: Response) => {
  res.send('Backend çalışıyor 🚀');
});

// Health endpoint - Backend canlı mı kontrolü (DB'den bağımsız)
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    port: PORT,
    ts: new Date().toISOString(),
  });
});

app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as ok');
    return res.json({ success: true, db: result.recordset });
  } catch (error: any) {
    console.error('DB Health Check Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: {
        message: error?.message,
        code: error?.code,
        original: error?.originalError?.message,
      }
    });
  }
});

app.get('/api/health/auth', (req: Request, res: Response) => {
  return res.json({ 
    ok: true, 
    bodyExample: req.body ?? null,
    method: req.method,
    path: req.path,
  });
});

app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS test');

    res.json({ success: true, db: result.recordset });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({ success: false, error });
  }
});

// ------------------------
//  AUTH
// ------------------------
app.use('/api/auth', authRoutes);

// ------------------------
//  QUESTIONS
// ------------------------
app.use('/api/questions', questionsRoutes);

// ------------------------
//  CATEGORIES
// ------------------------
app.use('/api/categories', categoriesRoutes);

// ------------------------
//  GROUPS
// ------------------------
app.use('/api/groups', groupsRoutes);

// ------------------------
//  USERS
// ------------------------
app.use('/api/users', usersRoutes);

// ------------------------
//  SEARCH
// ------------------------
app.use('/api/search', searchRoutes);

// ------------------------
//  ANSWERS
// ------------------------
app.use('/api/answers', answersRoutes);

// ------------------------
//  DM (Direct Messages)
// ------------------------
app.use('/api/dm', dmRoutes);

// ------------------------
//  NOTIFICATIONS
// ------------------------
app.use('/api/notifications', notificationsRoutes);

// ------------------------
//  FOLLOWS
// ------------------------
app.use('/api/follows', followsRoutes);

// ------------------------
//  GLOBAL ERROR HANDLER (tüm route'lardan sonra)
// ------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ GLOBAL ERROR HANDLER:', {
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
    originalError: err?.originalError?.message,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  const statusCode = err?.statusCode || err?.status || 500;
  
  return res.status(statusCode).json({
    success: false,
    message: err?.message || 'Internal Server Error',
    error: {
      message: err?.message,
      code: err?.code,
      original: err?.originalError?.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err?.stack }),
    },
  });
});

// DB bağlantısını async olarak başlat (server'ı bloklamadan)
(async () => {
  try {
    await getPool();
    console.log("✅ DB connection initialized");
  } catch (err: any) {
    console.error("❌ DB connection failed (server will continue without DB):", err.message);
  }
})();

// HTTP Server'ı dinle (DB bağlantısından bağımsız)
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
  console.log(`✅ Socket.IO attached to http://localhost:${PORT}`);
  console.log(`✅ CORS origins: ${FRONTEND_ORIGINS.join(', ')}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});


