const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// 中間件
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// 處理 OPTIONS 請求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Gmail SMTP 配置
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ 缺少環境變數: GMAIL_USER 或 GMAIL_APP_PASSWORD');
    return null;
  }
  
  const cleanPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '');
  
  console.log('🔧 創建 SMTP 傳輸器...');
  console.log('📧 用戶:', process.env.GMAIL_USER);
  console.log('🔑 密碼長度:', cleanPassword.length);
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: cleanPassword
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// 郵件模板函數
function generateEmailContent(type, notification_type, data) {
  let subject = '';
  let html = '';

  const baseHeader = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: #3b82f6; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0 0 5px 0;">北商熱音社練團室系統</h2>
        <p style="margin: 0; opacity: 0.9;">${type === 'admin' ? '管理員通知' : '用戶通知'}</p>
      </div>
      <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px;">
  `;

  const baseFooter = `
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9rem;">
            <p>此為系統自動發送郵件，請勿直接回覆</p>
            <p>北商熱音社練團室預約系統</p>
          </div>
        </div>
      </div>
  `;

  if (type === 'admin') {
    if (notification_type === 'user_registration') {
      subject = `【新用戶註冊】${data.real_name} 已完成註冊`;
      html = baseHeader + `
        <h3 style="color: #1e293b; margin-bottom: 15px;">有新用戶完成註冊</h3>
        <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 15px 0;">
          <h4 style="color: #3b82f6; margin-bottom: 10px;">用戶資訊</h4>
          <p><strong>姓名：</strong>${data.real_name}</p>
          <p><strong>學號：</strong>${data.student_id}</p>
          <p><strong>電子郵件：</strong>${data.user_email}</p>
          <p><strong>電話：</strong>${data.phone}</p>
          <p><strong>註冊時間：</strong>${data.timestamp}</p>
        </div>
        <p>請前往管理後台審核用戶資料。</p>
      ` + baseFooter;
    } else if (notification_type === 'new_booking') {
      subject = `【新預約通知】${data.real_name} 預約了練團室`;
      html = baseHeader + `
        <h3 style="color: #1e293b; margin-bottom: 15px;">有新的練團室預約</h3>
        <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 15px 0;">
          <h4 style="color: #3b82f6; margin-bottom: 10px;">預約詳情</h4>
          <p><strong>預約人：</strong>${data.real_name} (${data.user_email})</p>
          <p><strong>日期：</strong>${data.booking_date}</p>
          <p><strong>時間：</strong>${data.booking_time}</p>
          <p><strong>類型：</strong>${data.booking_type}</p>
          <p><strong>名稱：</strong>${data.booking_name}</p>
          ${data.booking_notes ? `<p><strong>備註：</strong>${data.booking_notes}</p>` : ''}
          <p><strong>預約時間：</strong>${data.timestamp}</p>
        </div>
      ` + baseFooter;
    }
  } else if (type === 'user') {
    if (notification_type === 'approval_result') {
      subject = `【帳號審核通知】${data.real_name} - 北商熱音社`;
      const statusText = data.approval_status === 'approved' ? '已通過' : '未通過';
      const statusColor = data.approval_status === 'approved' ? '#10b981' : '#f59e0b';
      
      html = baseHeader + `
        <h3 style="color: #1e293b; margin-bottom: 15px;">帳號審核結果</h3>
        <p>親愛的 ${data.real_name} 同學：</p>
        <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${statusColor};">
          <p style="margin: 0; color: ${statusColor}; font-weight: bold;">您的帳號審核結果：${statusText}</p>
          ${data.approval_status === 'approved' ? 
            '<p style="margin: 10px 0 0 0;">恭喜！您的帳號已通過審核，請重新登入系統以啟用預約功能。</p>' : 
            `<p style="margin: 10px 0 0 0;">很抱歉，您的帳號審核未通過。</p>
             ${data.admin_notes ? `<p style="margin: 10px 0 0 0;"><strong>原因：</strong>${data.admin_notes}</p>` : ''}`
          }
        </div>
      ` + baseFooter;
    } else if (notification_type === 'booking_confirmation') {
      subject = `【預約成功】${data.booking_date} ${data.booking_time} - ${data.booking_name}`;
      html = baseHeader + `
        <h3 style="color: #1e293b; margin-bottom: 15px;">預約成功！</h3>
        <p>親愛的 ${data.real_name} 同學：</p>
        <p>您的練團室預約已成功，以下是預約詳情：</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 15px 0;">
          <h4 style="color: #3b82f6; margin-bottom: 10px;">預約資訊</h4>
          <p><strong>日期：</strong>${data.booking_date}</p>
          <p><strong>時間：</strong>${data.booking_time}</p>
          <p><strong>類型：</strong>${data.booking_type}</p>
          <p><strong>名稱：</strong>${data.booking_name}</p>
          ${data.booking_notes ? `<p><strong>備註：</strong>${data.booking_notes}</p>` : ''}
          <p><strong>預約編號：</strong>${data.booking_id}</p>
          <p><strong>確認時間：</strong>${data.timestamp}</p>
        </div>
        <p><strong>請注意：</strong>請準時到達練團室，如有變動請提前取消預約。</p>
      ` + baseFooter;
    }
  }

  return { subject, html };
}

// 測試郵件連接
const testEmailConnection = async () => {
  console.log('\n🔧 開始測試郵件伺服器連接...');
  
  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP 傳輸器創建失敗');
    }

    await transporter.verify();
    console.log('✅ 郵件伺服器連接成功');

    const testMail = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: '📧 北商熱音社郵件服務測試 - Railway',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #3b82f6;">北商熱音社郵件服務測試</h2>
          <p>這是一封測試郵件，表示您的郵件服務已在 Railway 正常運作！</p>
          <p><strong>時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(testMail);
    console.log('✅ 測試郵件發送成功:', info.messageId);
    
  } catch (error) {
    console.error('❌ 郵件伺服器連接失敗:', error.message);
    setTimeout(testEmailConnection, 30000);
  }
};

// 郵件發送 API
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, type, notification_type, data } = req.body;

    console.log('📧 收到郵件發送請求:', { to, type, notification_type });

    const emailContent = generateEmailContent(type, notification_type, data);
    const transporter = createTransporter();
    
    if (!transporter) {
      throw new Error('郵件服務未就緒');
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ 郵件發送成功');
    res.json({ 
      success: true, 
      message: '郵件發送成功',
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('❌ 郵件發送失敗:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '郵件發送失敗',
      details: error.message 
    });
  }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: '北商熱音社郵件服務',
    timestamp: new Date().toISOString(),
    environment: 'Railway'
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動成功，端口：${PORT}`);
  console.log(`📧 郵件 API 端點：http://localhost:${PORT}/api/send-email`);
  console.log(`❤️  健康檢查：http://localhost:${PORT}/api/health`);
  console.log(`📨 發件人：${process.env.GMAIL_USER}`);
  
  setTimeout(testEmailConnection, 5000);
});