#!/usr/bin/env node

/**
 * H5 静态文件服务器
 * 用于在浏览器中测试和运行 uni-app H5 页面
 * 
 * 功能:
 * - 提供静态文件服务
 * - API代理到后端服务
 * - 支持History路由模式
 * - 自动打开浏览器
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8081';

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 代理API请求到后端
const { createProxyMiddleware } = require('http-proxy-middleware');

// 代理 /api/* 到后端服务
app.use('/api', createProxyMiddleware({
  target: API_BASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${API_BASE_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${req.url}: ${err.message}`);
    res.status(500).json({
      code: 500,
      message: '代理请求失败: ' + err.message,
      success: false
    });
  }
}));

// 静态文件目录
const staticDir = path.join(__dirname, 'dist', 'build', 'h5');
const staticDir2 = path.join(__dirname, 'dist');
const staticDir3 = path.join(__dirname);

// 检查dist目录是否存在
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  console.log(`[STATIC] 使用静态文件目录: ${staticDir}`);
} else if (fs.existsSync(staticDir2)) {
  app.use(express.static(staticDir2));
  console.log(`[STATIC] 使用静态文件目录: ${staticDir2}`);
} else {
  app.use(express.static(staticDir3));
  console.log(`[STATIC] 使用静态文件目录: ${staticDir3}`);
}

// SPA History模式支持
app.get('*', (req, res) => {
  const indexHtml = path.join(staticDir, 'index.html');
  const indexHtml2 = path.join(staticDir2, 'index.html');
  const indexHtml3 = path.join(staticDir3, 'index.html');
  
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else if (fs.existsSync(indexHtml2)) {
    res.sendFile(indexHtml2);
  } else if (fs.existsSync(indexHtml3)) {
    res.sendFile(indexHtml3);
  } else {
    res.status(404).send(`
      <html>
        <head>
          <title>Live Debate - H5</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              border: 1px solid rgba(255, 255, 255, 0.18);
              max-width: 600px;
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 20px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            p {
              font-size: 1.2em;
              line-height: 1.6;
              margin-bottom: 30px;
              opacity: 0.9;
            }
            .button {
              display: inline-block;
              background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
              color: white;
              padding: 15px 30px;
              border-radius: 50px;
              text-decoration: none;
              font-weight: bold;
              font-size: 1.1em;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
              transition: all 0.3s ease;
              margin: 10px;
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            .button:active {
              transform: translateY(0);
            }
            .api-status {
              margin-top: 30px;
              padding: 20px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
            .status-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 10px 0;
            }
            .status-label {
              font-weight: bold;
            }
            .status-value {
              padding: 5px 10px;
              border-radius: 20px;
              font-size: 0.9em;
              font-weight: bold;
            }
            .status-ok {
              background: #4CAF50;
              color: white;
            }
            .status-error {
              background: #f44336;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎤 直播辩论</h1>
            <p>这是一个 uni-app 直播辩论小程序的 H5 版本</p>
            <p>当前项目需要编译后才能运行 H5 页面</p>
            
            <div class="api-status">
              <div class="status-item">
                <span class="status-label">后端API:</span>
                <span class="status-value status-ok">${API_BASE_URL}</span>
              </div>
              <div class="status-item">
                <span class="status-label">前端H5:</span>
                <span class="status-value status-error">未编译</span>
              </div>
            </div>
            
            <p style="font-size: 1em; opacity: 0.8; margin-top: 30px;">
              💡 推荐使用 HBuilderX 打开项目并运行
            </p>
            
            <a href="http://localhost:8081/swagger-ui.html" class="button" target="_blank">
              📚 查看API文档
            </a>
            <a href="http://localhost:8081/api/debate-topic" class="button" target="_blank">
              🎯 测试API
            </a>
          </div>
          
          <script>
            // 自动检测后端状态
            fetch('/api/debate-topic')
              .then(res => res.json())
              .then(data => {
                if (data.code === 0) {
                  document.querySelector('.status-value').className = 'status-value status-ok';
                }
              })
              .catch(err => {
                console.error('API测试失败:', err);
              });
          </script>
        </body>
      </html>
    `);
  }
});

// 启动服务器
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('   🎤 直播辩论小程序 - H5 开发服务器');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(`✓ 服务器运行中: http://localhost:${PORT}`);
  console.log(`✓ API代理地址: ${API_BASE_URL}`);
  console.log('');
  console.log('访问地址:');
  console.log(`  H5页面: http://localhost:${PORT}`);
  console.log(`  API文档: ${API_BASE_URL}/swagger-ui.html`);
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('');
  
  // 自动打开浏览器
  const { exec } = require('child_process');
  setTimeout(() => {
    console.log('正在打开浏览器...');
    const url = `http://localhost:${PORT}`;
    
    // Windows
    exec(`start "" "${url}"`, (error) => {
      if (error) {
        // macOS
        exec(`open "${url}"`, (error2) => {
          if (error2) {
            // Linux
            exec(`xdg-open "${url}"`);
          }
        });
      }
    });
  }, 1000);
});

// 错误处理
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[错误] 端口 ${PORT} 已被占用！`);
    console.error('请检查是否有其他程序占用此端口，或修改 h5-server.js 中的 PORT 变量');
    process.exit(1);
  } else {
    console.error('服务器错误:', error);
  }
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('   正在关闭服务器...');
  console.log('═══════════════════════════════════════════');
  console.log('');
  server.close(() => {
    console.log('✓ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;
