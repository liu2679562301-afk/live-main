/**
 * 直播辩论系统 - 网关代理服务 (代理层)
 * 将请求代理到后端 Spring Boot 服务 (8081端口)
 * 提供跨域支持、WebSocket、静态文件服务
 * 
 * 架构：
 * 客户端 (8080) -> 网关代理 -> 后端API (8081)
 * 
 * 端口配置：
 * - 网关监听端口: 8080
 * - 后端API端口: 8081
 */

const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');

// 创建代理服务器
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true
});

// 后端API服务器地址（从环境变量读取，Railway部署用）
const BACKEND_API_URL = process.env.BACKEND_URL || 'http://localhost:8081';

// CORS配置 - 允许所有来源（开发环境）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// ==================== 静态文件服务 ====================

// 注：如果需要提供静态文件服务，请在此处添加
// 例如：app.use(express.static(path.join(__dirname, 'public')));

// ==================== API请求代理 ====================

// 代理所有 /api/* 请求到后端服务器
app.all('/api/*', (req, res) => {
  console.log(`🔀 代理请求: ${req.method} ${req.originalUrl} -> ${BACKEND_API_URL}`);
  
  // 转发请求到后端API
  proxy.web(req, res, {
    target: BACKEND_API_URL,
    ignorePath: false
  }, (error) => {
    console.error(`❌ 代理请求失败: ${error.message}`);
    res.status(502).json({
      code: 502,
      message: '网关代理错误',
      data: null,
      timestamp: Date.now()
    });
  });
});

// ==================== WebSocket支持 ====================

// 创建HTTP服务器（用于支持WebSocket）
const server = http.createServer(app);

// WebSocket代理配置
const BACKEND_WS_URL = BACKEND_API_URL.replace('http', 'ws');

// 处理WebSocket升级请求
server.on('upgrade', (req, socket, head) => {
  console.log(`🔀 WebSocket升级请求: ${req.url}`);
  
  // 只代理/ws路径的WebSocket请求
  if (req.url.startsWith('/ws')) {
    console.log(`🔀 代理WebSocket: ${req.url} -> ${BACKEND_WS_URL}${req.url}`);
    
    // 使用http-proxy代理WebSocket
    proxy.ws(req, socket, head, {
      target: BACKEND_WS_URL,
      changeOrigin: true
    }, (error) => {
      console.error('❌ WebSocket代理失败:', error.message);
      socket.destroy();
    });
  } else {
    console.warn(`⚠️  非WebSocket升级请求: ${req.url}`);
    socket.destroy();
  }
});

// ==================== 健康检查 ====================
// 必须在404处理之前定义

app.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: '网关服务运行正常',
    data: {
      service: 'live-debate-gateway',
      version: '2.0.0',
      status: 'running',
      timestamp: Date.now(),
      backend: BACKEND_API_URL,
      websocketEndpoint: BACKEND_WS_URL + '/ws'
    },
    timestamp: Date.now()
  });
});

// ==================== 错误处理 ====================

// 代理错误处理
proxy.on('error', (error, req, res) => {
  console.error('代理错误:', error.message);
  if (!res.headersSent) {
    res.status(500).json({
      code: 500,
      message: '网关代理错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 404处理
app.use((req, res) => {
  console.log(`⚠️  路由未找到: ${req.method} ${req.url}`);
  res.status(404).json({
    code: 404,
    message: '路由未找到',
    data: null,
    timestamp: Date.now()
  });
});

// ==================== 启动服务器 ====================

// Railway环境使用PORT环境变量，本地开发使用8080
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log('🚀 网关代理服务已启动');
  console.log('═══════════════════════════════════════');
  console.log(`网关地址: http://localhost:${PORT}`);
  console.log(`后端API: ${BACKEND_API_URL}`);
  console.log(`WebSocket端点: ws://localhost:${PORT}/ws`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`端口: ${PORT}`);
  console.log('═══════════════════════════════════════');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('🛑 正在关闭网关服务...');
  server.close(() => {
    console.log('✅ 网关服务已关闭');
    process.exit(0);
  });
});