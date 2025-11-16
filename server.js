const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// 允許的來源列表
const allowedOrigins = [
  'https://ntub-band-frontend.vercel.app',
  'https://ntub-band-frontend-j2w70err3-suyi0204s-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080'
];

// CORS 設定
app.use(cors({
  origin: function (origin, callback) {
    // 允許沒有 origin 的請求（如伺服器對伺服器）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// 處理 OPTIONS 請求（預檢請求）
app.options('*', cors());

// 其餘的程式碼保持不變...
app.post('/api/send-email', async (req, res) => {
  // 您的郵件發送程式碼
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: '北商熱音社郵件服務',
    timestamp: new Date().toISOString(),
    environment: 'Vercel',
    emailService: 'Resend',
    cors: 'Enabled'
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動成功，端口：${PORT}`);
  console.log(`🌐 CORS 已啟用，允許的來源：`, allowedOrigins);
});