# 直播辩论系统 - 网关集成指南

## 📋 集成概述

本项目使用 **网关代理模式** 替代原有的独立网关服务器模式，实现前端、网关、后端的正确集成。

### 架构对比

**原架构（有问题）：**
```
前端 (8080) -> 独立网关服务器 (8080，自己实现API逻辑)
```

**新架构（正确）：**
```
前端 (8080) -> 网关代理服务器 (8080) -> 后端Spring Boot (8081)
```

### 集成状态检查

✅ **后端项目**：完美符合要求
- 语言框架：Spring Boot (符合要求)
- 数据：使用 MockDataService (mock 数据，符合要求)
- 接口：已实现前端所需所有主要接口
- 响应格式：返回 `{ code: 0, message: "success", data: {...}, timestamp: ... }` (完全符合要求)

✅ **网关项目**：已更新为代理版本
- 模式：从独立服务器改为代理层
- 功能：提供 CORS 跨域支持、静态文件服务、WebSocket 代理
- 配置：监听 8080 端口，代理到后端 8081 端口

✅ **前端项目**：配置已更新
- API_BASE_URL：从 `http://localhost:8081` 改为 `http://localhost:8080`
- 连接：通过网关代理访问后端服务

## 🚀 启动步骤

### 1. 启动后端 Spring Boot 服务
```bash
# 进入后端目录
cd C:\Study\Web_FrontEnd\WX\Live-main\backend\live-debate-fullstack\backend

# 启动服务 (默认端口 8081)
mvn spring-boot:run
```

### 2. 启动网关代理服务
```bash
# 进入网关目录
cd C:\Study\Web_FrontEnd\WX\Live-main\Live-main\live-gateway-main

# 安装依赖
npm install

# 启动代理网关
npm start
```

### 3. 启动前端项目
```bash
# 进入前端目录
cd C:\Study\Web_FrontEnd\WX\Live-main\Live-main

# 使用 HBuilderX 运行到浏览器
# 或使用命令行
npm run dev:h5
```

## 🔧 关键修改点

### 1. 网关代理服务 (`gateway-proxy.js`)
- 创建新的代理网关，将 `/api/*` 请求转发到后端 8081 端口
- 提供 WebSocket 代理，连接到后端 WebSocket 端点
- 提供静态文件服务 (`/admin` 目录)
- 添加健康检查端点 (`/health`)

### 2. 前端配置 (`config/server-mode.js`)
```javascript
// 修改前
export const API_BASE_URL = LOCAL_SERVER_URL; // http://localhost:8081

// 修改后
export const API_BASE_URL = 'http://localhost:8080'; // 通过网关代理
```

### 3. 依赖更新 (`package.json`)
```json
{
  "main": "gateway-proxy.js",  // 改为代理版本
  "dependencies": {
    "http-proxy": "^1.18.1"    // 添加代理依赖
  }
}
```

## 📊 验证测试

### 1. 验证网关代理
```bash
# 测试网关代理功能
curl http://localhost:8080/api/recordings

# 预期响应：
# { "code": 0, "message": "success", "data": [...], "timestamp": ... }
```

### 2. 验证 WebSocket
```javascript
// 浏览器控制台测试
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('WebSocket connected');
ws.onmessage = (event) => console.log('Received:', event.data);
```

### 3. 验证录播功能
1. 访问前端页面：`http://localhost:8080`
2. 进入辩题直播间
3. 点击右上角 📼 按钮
4. 应成功切换到录播模式

## 🐛 常见问题解决

### 问题1：端口冲突
```bash
# 检查端口占用
netstat -an | findstr :8080
netstat -an | findstr :8081

# 停止占用进程
taskkill /F /PID <进程ID>
```

### 问题2：依赖安装失败
```bash
# 清理并重新安装
cd C:\Study\Web_FrontEnd\WX\Live-main\Live-main\live-gateway-main
rm -rf node_modules package-lock.json
npm install
```

### 问题3：跨域问题
确保网关配置正确：
```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedOriginPatterns: '*'
}));
```

## 📁 文件结构

```
live-gateway-main/
├── gateway-proxy.js          # 新的代理网关 (主入口)
├── gateway.js               # 原独立网关 (备份)
├── package.json             # 更新依赖配置
├── config/
│   └── server-mode.node.js  # 网关配置
├── admin/                   # 后台管理页面
│   ├── index.html
│   ├── db.js
│   └── ...
└── README-integration.md    # 本集成指南
```

## 🔗 相关文档

- [后端 API 文档](API-DOCUMENTATION.md) - 前端所需所有接口
- [网关原 README](README.md) - 原架构说明
- [前端配置文档](config/server-mode.js) - 服务器切换配置

## 📝 后续优化建议

1. **环境配置**：将端口配置提取到环境变量
2. **负载均衡**：支持多个后端实例
3. **监控告警**：添加网关健康监控
4. **日志管理**：完善请求日志记录

---

**集成完成时间**：2026-04-04 17:45  
**集成状态**：✅ 已完成  
**测试结果**：待用户验证