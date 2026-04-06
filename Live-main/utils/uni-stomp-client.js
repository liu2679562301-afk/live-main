/**
 * Uni-app STOMP客户端工具
 * 用于连接Spring Boot STOMP over SockJS WebSocket服务器
 * 依赖：sockjs-client 和 @stomp/stompjs（通过npm包安装）
 */

// Polyfill for global object (required by sockjs-client and @stomp/stompjs)
if (typeof global === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  } else if (typeof window !== 'undefined') {
    window.global = window;
  } else if (typeof self !== 'undefined') {
    self.global = self;
  } else {
    // Fallback for other environments
    global = {};
  }
}

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

/**
 * 创建并配置STOMP客户端
 * @param {Object} options 配置选项
 * @param {string} options.endpoint - SockJS端点路径，默认 '/ws'
 * @param {string} options.baseUrl - API基础URL，例如 'http://localhost:8081'
 * @param {number} options.reconnectDelay - 重连延迟（毫秒），默认 5000
 * @param {number} options.heartbeatIncoming - 入站心跳间隔（毫秒），默认 4000
 * @param {number} options.heartbeatOutgoing - 出站心跳间隔（毫秒），默认 4000
 * @param {Function} options.onConnect - 连接成功回调
 * @param {Function} options.onError - 连接错误回调
 * @param {Function} options.onDisconnect - 断开连接回调
 * @param {boolean} options.debug - 是否启用调试日志，默认 false
 * @returns {Object} STOMP客户端实例
 */
export function createStompClient(options = {}) {
  const {
    endpoint = '/ws',
    baseUrl,
    reconnectDelay = 5000,
    heartbeatIncoming = 4000,
    heartbeatOutgoing = 4000,
    onConnect = () => {},
    onError = () => {},
    onDisconnect = () => {},
    debug = false
  } = options;

  // 如果没有提供baseUrl，使用默认值
  let actualBaseUrl = baseUrl;
  if (!actualBaseUrl) {
    console.warn('未提供baseUrl参数，使用默认地址 http://localhost:8081');
    actualBaseUrl = 'http://localhost:8081';
  }

  // 构建完整的SockJS URL
  const sockJsUrl = `${actualBaseUrl}${endpoint}`;
  
  let client = null;
  let isConnected = false;
  let reconnectTimer = null;
  const subscriptions = new Map();

  // 初始化STOMP客户端
  function initClient() {
    // 清理现有客户端
    if (client) {
      client.deactivate();
      client = null;
    }

    client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: reconnectDelay,
      heartbeatIncoming: heartbeatIncoming,
      heartbeatOutgoing: heartbeatOutgoing,
      debug: debug ? (str) => console.log('[STOMP]', str) : () => {},
      
      onConnect: (frame) => {
        console.log('✅ STOMP WebSocket 已连接', frame);
        isConnected = true;
        onConnect(frame);
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP协议错误', frame);
        onError(new Error(`STOMP错误: ${frame.headers?.message || '未知错误'}`));
      },
      
      onWebSocketError: (event) => {
        console.error('❌ WebSocket连接错误', event);
        onError(new Error('WebSocket连接失败'));
        scheduleReconnect();
      },
      
      onDisconnect: () => {
        console.log('🔌 STOMP WebSocket 已断开');
        isConnected = false;
        subscriptions.clear();
        onDisconnect();
        scheduleReconnect();
      }
    });
  }

  // 连接方法
  function connect() {
    if (isConnected) return;
    
    try {
      console.log('🔗 连接STOMP WebSocket:', sockJsUrl);
      initClient();
      client.activate();
    } catch (error) {
      console.error('WebSocket 连接初始化失败:', error);
      onError(error);
      scheduleReconnect();
    }
  }

  // 断开连接方法
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    subscriptions.clear();
    
    if (client) {
      client.deactivate();
      client = null;
    }
    isConnected = false;
    console.log('👋 STOMP WebSocket 已断开');
  }

  // 订阅主题
  function subscribe(destination, callback, headers = {}) {
    if (!isConnected || !client) {
      console.warn('未连接，无法订阅');
      return null;
    }

    const subscription = client.subscribe(destination, (message) => {
      try {
        const body = JSON.parse(message.body);
        callback(body, message);
      } catch (error) {
        console.error('消息解析失败', error);
        // 尝试直接传递原始消息体
        callback(message.body, message);
      }
    }, headers);

    const subId = Date.now() + Math.random().toString(36).substr(2);
    subscriptions.set(subId, subscription);
    console.log(`📡 已订阅: ${destination}`);
    
    return {
      id: subId,
      unsubscribe: function() {
        if (subscriptions.has(subId)) {
          subscription.unsubscribe();
          subscriptions.delete(subId);
          console.log(`📡 已取消订阅: ${destination}`);
        }
      }
    };
  }

  // 发送消息
  function send(destination, body, headers = {}) {
    if (!isConnected || !client) {
      console.warn('未连接，无法发送消息');
      return;
    }
    
    const jsonBody = typeof body === 'string' ? body : JSON.stringify(body);
    client.publish({ destination, body: jsonBody, headers });
  }

  // 计划重连
  function scheduleReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = setTimeout(() => {
      console.log('🔄 尝试重连...');
      disconnect();
      connect();
    }, reconnectDelay);
  }

  // 公共API
  return {
    connect,
    disconnect,
    subscribe,
    send,
    isConnected: () => isConnected,
    getClient: () => client,
    getSubscriptions: () => Array.from(subscriptions.values())
  };
}

/**
 * 创建用于直播状态更新的STOMP客户端
 * @param {string} streamId 直播流ID（可选）
 * @param {Function} onLiveStatusUpdate 直播状态更新回调
 * @param {Function} onVotesUpdate 投票更新回调
 * @returns {Object} 配置好的STOMP客户端
 */
export function createLiveStompClient(streamId, onLiveStatusUpdate, onVotesUpdate) {
  return createStompClient({
    endpoint: '/ws',
    reconnectDelay: 5000,
    debug: process.env.NODE_ENV === 'development',
    onConnect: (frame) => {
      console.log('✅ 直播STOMP客户端已连接');
      
      // 订阅直播状态主题
      if (streamId) {
        this.voteSubscription = this.subscribe('/topic/vote-updates', (message) => {
          if (onVotesUpdate) {
            // 检查消息是否属于当前直播流
            const msgStreamId = message.streamId || message.data?.streamId;
            if (!msgStreamId || msgStreamId === streamId) {
              onVotesUpdate(message);
            }
          }
        });
        
        this.liveSubscription = this.subscribe('/topic/live-status', (message) => {
          if (onLiveStatusUpdate) {
            const msgStreamId = message.streamId || message.data?.streamId;
            if (!msgStreamId || msgStreamId === streamId) {
              onLiveStatusUpdate(message);
            }
          }
        });
      } else {
        // 如果没有指定streamId，订阅所有流
        this.voteSubscription = this.subscribe('/topic/vote-updates', onVotesUpdate);
        this.liveSubscription = this.subscribe('/topic/live-status', onLiveStatusUpdate);
      }
    },
    onError: (error) => {
      console.error('❌ 直播STOMP客户端连接失败', error);
    },
    onDisconnect: () => {
      console.log('🔌 直播STOMP客户端已断开');
    }
  });
}

export default {
  createStompClient,
  createLiveStompClient
};