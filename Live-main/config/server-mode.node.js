// config/server-mode.node.js (Node.js后端专用)
// Railway部署配置：使用环境变量，无硬编码
const USE_MOCK_SERVER = process.env.NODE_ENV === 'production' ? false : true; // 生产环境使用真实模式
const DEPLOY_PORT = process.env.PORT || 8080; // Railway默认使用PORT环境变量
const REAL_SERVER_URL = process.env.REAL_SERVER_URL || `http://localhost:${DEPLOY_PORT}`;
const REAL_SERVER_PORT = DEPLOY_PORT;

// 后端服务器配置（真正的后端服务器地址）
const BACKEND_SERVER_URL = process.env.BACKEND_SERVER_URL || null; // 如果没有后端服务器，设为null
// 是否优先使用后端服务器（设为 true 时，所有 API 请求会优先代理到后端服务器）
const PRIORITIZE_BACKEND_SERVER = process.env.PRIORITIZE_BACKEND_SERVER === 'true' || false;

// 微信配置（Railway部署不需要微信上线，使用模拟模式）
const REAL_WECHAT_CONFIG = {
    appid: process.env.WECHAT_APPID || 'wx94289b0d2ca7a802',
    secret: process.env.WECHAT_SECRET || 'mock_secret_for_development'
};

// 直播流配置（Railway部署不需要直播服务）
const SRS_SERVER_URL = process.env.SRS_SERVER_URL || null; // 如果没有直播服务，设为null

// 模拟服务器配置
const MOCK_SERVER_CONFIG = {
    host: '0.0.0.0',
    port: DEPLOY_PORT,
    url: `http://0.0.0.0:${DEPLOY_PORT}`
};
const getCurrentServerConfig = () => {
    // Railway部署：生产环境使用真实模式，但微信使用模拟（因为不需要微信上线）
    const isProduction = process.env.NODE_ENV === 'production';
    const wechatUseMock = isProduction ? true : USE_MOCK_SERVER; // 生产环境也使用微信模拟
    
    if (USE_MOCK_SERVER) {
        return {
            mode: 'mock',
            url: MOCK_SERVER_CONFIG.url,
            host: MOCK_SERVER_CONFIG.host,
            port: MOCK_SERVER_CONFIG.port,
            wechat: {
                useMock: wechatUseMock,
                appid: REAL_WECHAT_CONFIG.appid,
                secret: REAL_WECHAT_CONFIG.secret
            }
        };
    } else {
        // 使用真实服务器，部署模式
        return {
            mode: 'real',
            url: REAL_SERVER_URL,
            port: DEPLOY_PORT,
            wechat: {
                useMock: wechatUseMock, // 生产环境使用模拟微信
                appid: REAL_WECHAT_CONFIG.appid,
                secret: REAL_WECHAT_CONFIG.secret
            }
        };
    }
};
const printConfig = () => {
    const config = getCurrentServerConfig();
    console.log('═══════════════════════════════════════');
    console.log('📋 服务器配置信息 (Railway部署优化)');
    console.log('═══════════════════════════════════════');
    console.log(`模式: ${config.mode === 'mock' ? '🧪 模拟服务器' : '🌐 真实服务器'}`);
    console.log(`地址: ${config.url}`);
    console.log(`端口: ${config.port}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`微信登录: ${config.wechat.useMock ? '模拟模式 (Railway部署)' : '真实模式'}`);
    console.log(`直播服务: ${SRS_SERVER_URL ? '启用' : '禁用 (Railway部署)'}`);
    console.log(`后端代理: ${BACKEND_SERVER_URL ? `启用 -> ${BACKEND_SERVER_URL}` : '禁用'}`);
    console.log('═══════════════════════════════════════');
};
module.exports = {
	USE_MOCK_SERVER,
	MOCK_SERVER_CONFIG,
	REAL_SERVER_URL,
	REAL_SERVER_PORT,
	REAL_WECHAT_CONFIG,
	BACKEND_SERVER_URL,
	PRIORITIZE_BACKEND_SERVER,
	getCurrentServerConfig,
	printConfig,
	SRS_SERVER_URL,
};
