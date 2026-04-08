# Live Debate - 辩论直播互动平台

## 📌 基本信息

**项目名称**: Live Debate - 辩论直播互动平台  
**项目描述**: 一个支持实时直播、用户投票、AI内容生成和录播管理的辩论互动平台，采用前后端分离架构，提供完整的直播辩论体验。

---

## 🚀 演示地址

### 前端访问地址
- **Vercel部署**: https://live-main-liu2679562301-afk-lf-f69a5d36.vercel.app

### 后端API地址
- **后端服务**: https://live-debate-backend-production.up.railway.app
- **网关服务**: https://live-debate-gateway-production.up.railway.app
- **健康检查**: https://live-debate-backend-production.up.railway.app/health

---

## 🧱 技术栈说明

### 后端框架
- **Spring Boot 3.x**: Java后端框架，提供RESTful API服务
- **WebSocket**: 原生WebSocket + STOMP协议，实现实时双向通信
- **MinIO**: 对象存储服务，用于录播文件存储（生产环境可选）
- **Lombok**: 简化Java实体类开发
- **Maven**: 项目构建与依赖管理

### Mock数据生成方案
- **MockDataService**: 内置Java代码模拟数据，无需外部依赖
- **内存数据存储**: 使用ConcurrentHashMap存储临时数据
- **自动生成ID**: 基于UUID生成唯一标识
- **随机数据**: 使用Java随机数生成器模拟真实数据分布

### 部署平台与方式
- **Vercel**: 前端静态资源部署，支持自动构建和CDN加速
- **Railway**: 后端Java应用和Node.js网关部署，支持容器化运行
- **环境变量配置**: 通过平台环境变量管理不同环境的配置
- **API网关**: Node.js实现反向代理，统一入口管理

---

## 🔗 项目结构与接口说明

### 源码结构

```
/
├── frontend/              # 前端项目（uni-app）
│   ├── Live-main/        # 主应用代码
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 公共组件
│   │   └── config/       # 配置文件
│   └── vercel.json       # Vercel部署配置
├── gateway/              # 网关代理项目
│   ├── gateway-proxy.js  # 主网关服务
│   ├── railway.toml      # Railway部署配置
│   └── package.json      # 依赖配置
└── backend/              # 后端Java项目
    └── live-debate-fullstack/
        └── backend/
            ├── src/main/java/
            │   ├── controller/     # RESTful控制器
            │   ├── service/        # 业务逻辑服务
            │   ├── model/          # 数据模型
            │   ├── dto/            # 数据传输对象
            │   ├── config/         # 配置类
            │   └── websocket/      # WebSocket处理器
            └── src/main/resources/
                └── application.yml # 应用配置
```

### 主要接口列表

#### 1. 辩题管理
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取辩题信息 | GET | /api/debate-topic | 获取当前辩题详情 |
| 获取辩题信息(v1) | GET | /api/v1/debate-topic | v1版本辩题接口 |
| 管理端更新辩题 | PUT | /api/admin/debate | 更新辩题内容 |
| 创建新辩题 | POST | /api/v1/admin/debates | 创建新辩题 |

#### 2. 投票系统
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取投票数据 | GET | /api/votes | 获取当前投票结果 |
| 用户投票 | POST | /api/user-vote | 用户参与投票 |
| 管理端更新投票 | POST | /api/v1/admin/live/update-votes | 管理员设置投票数 |
| 查询用户投票状态 | GET | /api/v1/user-votes | 查询用户投票记录 |

#### 3. 直播流管理
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取所有直播流 | GET | /api/v1/admin/streams | 获取直播流列表 |
| 新增直播流 | POST | /api/v1/admin/streams | 创建新直播流 |
| 更新直播流 | PUT | /api/v1/admin/streams/{id} | 修改直播流信息 |
| 删除直播流 | DELETE | /api/v1/admin/streams/{id} | 删除直播流 |
| 切换直播状态 | POST | /api/admin/streams/{streamId}/toggle | 启用/禁用直播流 |

#### 4. 录播管理
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取录播列表 | GET | /api/recordings | 获取所有录播 |
| 获取录播详情 | GET | /api/recordings/{id} | 获取单个录播信息 |
| 创建录播 | POST | /api/recordings | 创建录播元数据 |
| 更新录播 | PUT | /api/recordings/{id} | 修改录播信息 |
| 删除录播 | DELETE | /api/recordings/{id} | 删除录播 |
| 获取播放URL | GET | /api/recordings/{id}/play | 获取预签名播放链接 |
| 搜索录播 | GET | /api/recordings/search | 按关键词搜索录播 |
| 上传录播文件 | POST | /api/recordings/upload | 原子化上传文件并创建元数据 |

#### 5. AI内容管理
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取AI内容 | GET | /api/ai-content | 获取AI生成内容列表 |
| 获取AI内容(v1) | GET | /api/v1/ai-content | v1版本AI内容接口 |
| 新增AI内容 | POST | /api/admin/ai-content | 创建AI内容 |
| 更新AI内容 | PUT | /api/admin/ai-content/{id} | 修改AI内容 |
| 删除AI内容 | DELETE | /api/admin/ai-content/{id} | 删除AI内容 |
| 发表评论 | POST | /api/comment | 用户对AI内容发表评论 |
| 删除评论 | DELETE | /api/comment/{commentId} | 删除评论 |
| 点赞 | POST | /api/like | 对内容或评论点赞 |

#### 6. 用户管理
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 微信登录 | POST | /api/wechat-login | 微信小程序登录 |
| 获取用户列表 | GET | /api/admin/miniprogram/users | 分页获取用户 |
| 获取所有用户 | GET | /api/admin/users | 获取所有用户 |
| 获取用户详情 | GET | /api/admin/users/{id} | 获取单个用户信息 |

#### 7. 直播控制
| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 用户控制直播 | POST | /api/live/control | 开始/停止直播 |
| 管理端开始直播 | POST | /api/v1/admin/live/start | 后台开始直播 |
| 管理端停止直播 | POST | /api/v1/admin/live/stop | 后台停止直播 |
| 获取直播状态 | GET | /api/admin/live/status | 获取直播状态 |
| 数据概览 | GET | /api/v1/admin/dashboard | 获取直播数据概览 |
| 重置投票 | POST | /api/v1/admin/live/reset-votes | 重置投票数据 |

#### 8. WebSocket实时通信
| 功能 | 类型 | 路径 | 描述 |
|------|------|------|------|
| STOMP连接 | WebSocket | /ws | STOMP协议WebSocket端点 |
| 原生WebSocket | WebSocket | /ws-native | 原生WebSocket端点 |
| 投票更新 | 订阅 | /topic/votes | 订阅投票实时更新 |
| 评论广播 | 订阅 | /topic/comments | 订阅新评论通知 |
| AI状态更新 | 订阅 | /topic/ai-status | 订阅AI识别状态变化 |
| 观看人数更新 | 订阅 | /topic/viewers | 订阅观看人数变化 |

---

## 🧠 项目开发过程笔记

### 项目实现思路

本项目采用**前后端分离架构**，通过API网关统一管理和转发请求，实现模块化开发和部署：

1. **前端层**: 使用uni-app开发跨平台应用，编译为H5和小程序
2. **网关层**: Node.js实现反向代理，统一入口，支持路由转发和WebSocket代理
3. **后端层**: Spring Boot提供RESTful API和WebSocket实时通信
4. **存储层**: MinIO对象存储管理录播文件（生产环境可选）

**核心功能模块**:
- **辩题管理**: 支持辩题的CRUD操作，作为辩论核心主题
- **投票系统**: 支持100票分配制和增量投票，实时统计投票结果
- **直播控制**: 管理直播启停状态，统计观看人数
- **录播管理**: MinIO存储录播文件，生成预签名URL供前端播放
- **AI内容**: 模拟AI生成辩论论点，支持用户评论和点赞
- **实时通信**: 双WebSocket方案（STOMP + 原生）支持实时数据推送

### 遇到的问题与解决方案

#### 1. WebSocket协议不兼容问题
**问题描述**: 前端uni-app使用原生WebSocket，后端使用STOMP协议，导致连接失败
```
WebSocket connection to 'ws://localhost:8081/ws' failed
```

**解决方案**: 
- 创建双WebSocket端点：STOMP端点`/ws` + 原生端点`/ws-native`
- 实现`WebSocketMessageBroadcaster`类，同步STOMP消息到原生WebSocket客户端
- 前端连接原生端点，实现实时数据接收

#### 2. MinIO连接失败（生产环境）
**问题描述**: Railway部署时，后端尝试连接本地MinIO服务，导致启动失败
```
Failed to connect to localhost/[0:0:0:0:0:0:0:1]:9000
```

**解决方案**:
- 修改`application.yml`，设置`MINIO_ENDPOINT: false`禁用MinIO
- 在`MinioService.java`中添加`minioAvailable`标志位
- 实现优雅降级：MinIO不可用时返回模拟数据，不影响核心功能

#### 3. 网关健康检查404
**问题描述**: 访问网关健康检查端点返回404
```
{"code":404,"message":"路由未找到","data":null}
```

**解决方案**:
- 检查`gateway-proxy.js`路由顺序，确保健康检查在404处理器之前
- 重新添加健康检查路由处理逻辑
- 更新railway.toml配置，确保端口一致（8080）

#### 4. API跨域问题
**问题描述**: 前端调用后端API出现CORS错误

**解决方案**:
- 后端Controller添加`@CrossOrigin(origins = "*")`注解
- 网关层统一处理CORS预检请求
- Vercel配置vercel.json，设置API重写规则

### 本地联调经验

#### 1. 环境准备
```bash
# 后端启动
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081

# 网关启动
cd gateway && npm install && npm run dev

# 前端启动
npm run dev:h5
```

#### 2. 联调技巧
- **统一配置**: 使用`config/server-mode.js`管理API地址，支持dev/prod切换
- **WebSocket测试**: 使用Chrome DevTools的Network面板查看WS连接状态
- **Mock数据**: 后端内置Mock数据服务，无需依赖数据库即可联调
- **日志监控**: 后端日志输出详细，便于排查接口调用问题

#### 3. 调试要点
- 确保端口不冲突：后端8081，网关8080，前端默认端口
- WebSocket连接使用`ws://localhost:8080/ws-native`（通过网关转发）
- 录播功能需要本地MinIO服务，或使用模拟数据模式
- 注意跨域配置，特别是网关转发时的Header处理

### 部署步骤与踩坑记录

#### 1. 前端部署（Vercel）
**部署步骤**:
1. 连接GitHub仓库到Vercel
2. 选择`Live-main`目录作为根目录
3. 配置构建命令：`npm run build:h5`
4. 配置输出目录：`dist/build/h5`
5. 添加环境变量：`API_BASE_URL`指向网关地址
6. 配置`vercel.json`重写规则，代理API请求

**踩坑记录**:
- 问题：API请求404
- 解决：配置vercel.json重写规则，将`/api/*`代理到网关地址

#### 2. 后端部署（Railway）
**部署步骤**:
1. 连接GitHub仓库到Railway
2. 选择`backend/live-debate-fullstack/backend`目录
3. 配置Java环境，自动检测Maven构建
4. 设置环境变量：
   - `MINIO_ENDPOINT=false`（生产环境禁用MinIO）
   - `SERVER_PORT=8081`
5. 配置健康检查路径：`/health`

**踩坑记录**:
- 问题：MinIO连接失败导致启动失败
- 解决：设置`MINIO_ENDPOINT=false`，代码实现优雅降级

#### 3. 网关部署（Railway）
**部署步骤**:
1. 连接GitHub仓库到Railway
2. 选择`gateway`目录
3. 配置Node.js环境
4. 设置环境变量：
   - `BACKEND_URL=https://live-debate-backend-production.up.railway.app`
   - `PORT=8080`
5. 配置railway.toml，设置端口8080
6. 配置健康检查路径：`/health`

**踩坑记录**:
- 问题：网关返回404，健康检查失败
- 解决：修改railway.toml端口为8080，修复路由顺序

#### 4. 整体联调
**部署顺序**: 后端 → 网关 → 前端

**联调步骤**:
1. 确认后端健康检查正常
2. 测试网关转发API请求
3. 验证前端通过网关访问后端
4. 测试WebSocket连接（双协议）
5. 验证录播功能（模拟模式）

**关键配置**:
- 后端：`application.yml`配置端口和MinIO
- 网关：`gateway-proxy.js`配置后端地址和路由
- 前端：`config/server-mode.js`配置API_BASE_URL

### 可扩展性思考

#### 1. 真实后端扩展方案
**数据库替换**:
- 将`MockDataService`中的内存Map替换为JPA Repository
- 使用MySQL/PostgreSQL存储辩题、投票、用户等持久化数据
- 录播元数据存储到数据库，文件继续存储在MinIO

**用户认证**:
- 集成Spring Security + JWT实现真实用户认证
- 替换微信登录接口，调用微信官方API验证code
- 实现用户权限管理（管理员、普通用户）

#### 2. 直播服务集成
**SRS直播服务**:
- 部署SRS（Simple-RTMP-Server）服务
- 集成RTMP推流，支持OBS等推流工具
- 实现直播流转码和分发

**WebRTC支持**:
- 添加WebRTC支持，实现浏览器直接推流
- 集成SFU（Selective Forwarding Unit）架构

#### 3. 性能优化
**缓存策略**:
- Redis缓存热点数据（投票结果、观看人数）
- CDN加速静态资源分发
- MinIO配置CDN边缘节点

**负载均衡**:
- 后端多实例部署，使用Nginx负载均衡
- WebSocket会话粘滞（Sticky Session）
- 数据库读写分离

#### 4. 功能增强
**AI集成**:
- 集成真实AI服务（OpenAI、Claude等）
- 实现实时语音识别和论点生成
- 智能辩论评分系统

**数据分析**:
- 实时数据大屏，可视化投票趋势
- 用户行为分析，优化产品体验
- A/B测试框架，验证功能效果

**社交功能**:

- 用户关注系统，关注喜欢的主播
- 弹幕系统，增强互动体验
- 分享到社交媒体，扩大传播

---

## 🧍 个人介绍

● 深耕 Java 后端开发，熟悉微服务、高并发、缓存优化等核心技术，掌握 LangChain4J 框架及大模型应用开发，有多个企业级分布式项目实战经验。

● 注重代码质量与规范，具备良好的问题分析与排查能力，能独立解决高并发、分布式场景下的技术难点，实战中积累了丰富的故障处理经验。

● 学习能力强，乐于接受新挑战，具备快速适应团队开发节奏的能力，同时注重技术文档撰写与团队协作。

**技术背景**:
- 基础核心：

  ● Java：深入理解 JVM 内存模型、垃圾回收机制，熟练掌握多线程并发编程、集合框架等核心知识点

  ● 数据库：熟练掌握 MySQL，理解底层索引结构、事务隔离级别与锁机制，具备 SQL 调优、主从复制、读写分离实战经验

  ● 工具规范：熟练使用 Git、Maven 进行版本管理，掌握 JWT 鉴权机制，注重代码注释与文档撰写，能使用 Cursor 等 AI 工具提升开发效率

  框架与微服务：

  ● 主流框架：熟练掌握 Spring Boot、Spring MVC、MyBatis-Plus，理解其核心原理并能灵活落地

  ● 微服务：熟悉 Spring Cloud Alibaba 生态（Nacos、Feign、Gateway、Sentinel）

  中间件：

  ● 缓存：熟练掌握 Redis，理解线程模型及常用数据结构应用，能解决缓存穿透、击穿、雪崩问题，掌握 Redisson 分布式锁、Redis Sentinel 高可用架构

  ● 消息队列：熟练使用 RabbitMQ，能解决消息丢失、重复消费、消息积压等问题，理解死信队列、延迟队列的应用与落地

  AI 开发：

  ● 熟悉 LangChain4J 框架，能基于大模型构建智能体，实现 Function Calling、RAG 等 AI 相关应用开发

**项目角色**: 全栈开发工程师

**联系方式**:

- GitHub：https://github.com/liu2679562301-afk
- 邮箱：liu2679562301@163.com



---

**最后更新**: 2026-04-08