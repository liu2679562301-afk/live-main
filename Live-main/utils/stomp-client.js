/**
 * STOMP客户端工具
 * 用于连接Spring Boot STOMP over SockJS WebSocket服务器
 * 依赖：SockJS和Stomp（通过CDN或npm包引入）
 */

// 全局函数：创建并配置STOMP客户端
function createStompClient(options = {}) {
  const {
    endpoint = '/ws',
    protocols = [],
    reconnectDelay = 5000,
    heartbeatIncoming = 4000,
    heartbeatOutgoing = 4000,
    onConnect = () => {},
    onError = () => {},
    onDisconnect = () => {},
    debug = false
  } = options;

  // 确保全局SockJS和Stomp可用
  if (typeof SockJS === 'undefined') {
    throw new Error('SockJS未加载，请通过CDN或npm包引入');
  }
  if (typeof Stomp === 'undefined') {
    throw new Error('Stomp未加载，请通过CDN或npm包引入');
  }

  let connected = false;
  let subscriptions = new Map();
  let reconnectTimer = null;
  let socket = null;
  let stompClient = null;

  // 构建WebSocket URL（基于当前页面的API基础地址）
  function getWebSocketUrl() {
    // 优先使用传入的baseUrl，否则调用全局getAPIBase，最后使用默认
    if (options.baseUrl) {
      return options.baseUrl + endpoint;
    }
    if (typeof getAPIBase === 'function') {
      const base = getAPIBase();
      const url = new URL(base);
      const protocol = url.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${url.host}${endpoint}`;
    }
    // 默认回退到本地开发地址
    return 'http://localhost:8081' + endpoint;
  }

  // 连接方法
  function connect() {
    if (connected) return;
    
    try {
      const wsUrl = getWebSocketUrl();
      console.log('🔗 连接STOMP WebSocket:', wsUrl);
      
      // 创建SockJS实例
      socket = new SockJS(wsUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
      });
      
      // 创建STOMP客户端
      stompClient = Stomp.client(wsUrl);
      stompClient.debug = debug ? console.log : () => {};
      
      const connectHeaders = {
        ...protocols,
        'heart-beat': `${heartbeatOutgoing},${heartbeatIncoming}`
      };
      
      stompClient.connect(
        connectHeaders,
        function(frame) {
          console.log('✅ STOMP WebSocket 已连接', frame);
          connected = true;
          onConnect(frame);
        },
        function(error) {
          console.error('❌ STOMP WebSocket 连接失败', error);
          connected = false;
          onError(error);
          scheduleReconnect();
        }
      );
      
      // 监听SockJS关闭事件
      socket.onclose = function() {
        console.log('🔌 SockJS 连接关闭');
        connected = false;
        onDisconnect();
        scheduleReconnect();
      };
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
    
    subscriptions.forEach((subscription, id) => {
      subscription.unsubscribe();
    });
    subscriptions.clear();
    
    if (connected && stompClient) {
      stompClient.disconnect(function() {
        console.log('👋 STOMP WebSocket 已断开');
        connected = false;
      });
    }
    connected = false;
  }

  // 订阅主题
  function subscribe(destination, callback, headers = {}) {
    if (!connected || !stompClient) {
      console.warn('未连接，无法订阅');
      return null;
    }

    const subscription = stompClient.subscribe(destination, function(message) {
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
    if (!connected || !stompClient) {
      console.warn('未连接，无法发送消息');
      return;
    }
    
    const jsonBody = typeof body === 'string' ? body : JSON.stringify(body);
    stompClient.send(destination, headers, jsonBody);
  }

  // 计划重连
  function scheduleReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = setTimeout(function() {
      console.log('🔄 尝试重连...');
      disconnect(); // 清理旧连接
      connect();
    }, reconnectDelay);
  }

  // 公共API
  return {
    connect,
    disconnect,
    subscribe,
    send,
    isConnected: () => connected,
    getSocket: () => socket,
    getStompClient: () => stompClient
  };
}

// 向后兼容：暴露全局对象
if (typeof window !== 'undefined') {
  window.StompClientFactory = { createStompClient };
}