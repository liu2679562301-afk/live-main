package com.debate.livedebateserver.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;


import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 原生WebSocket处理器
 * 为uni-app前端提供原生WebSocket支持，兼容STOMP协议广播的消息
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-08
 */
@Slf4j
@Component
@ServerEndpoint("/ws-native")
public class NativeWebSocketHandler {

    // 存储所有连接的会话
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();
    
    // JSON解析器
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    // 用于接收STOMP服务广播的消息（需要静态引用）
    private static WebSocketMessageBroadcaster broadcaster;
    
    /**
     * 设置消息广播器（由Spring初始化时调用）
     */
    public static void setBroadcaster(WebSocketMessageBroadcaster broadcaster) {
        NativeWebSocketHandler.broadcaster = broadcaster;
    }

    /**
     * 连接建立时调用
     */
    @OnOpen
    public void onOpen(Session session) {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        log.info("WebSocket连接已建立，sessionId: {}, 当前连接数: {}", sessionId, sessions.size());
        
        // 发送连接成功消息
        sendMessage(session, createMessage("connected", "WebSocket连接成功", null));
    }

    /**
     * 接收到客户端消息时调用
     */
    @OnMessage
    public void onMessage(String message, Session session) {
        String sessionId = session.getId();
        log.debug("收到客户端消息，sessionId: {}, 消息: {}", sessionId, message);
        
        try {
            // 解析消息
            Map<String, Object> messageData = objectMapper.readValue(message, Map.class);
            String type = (String) messageData.get("type");
            
            // 处理不同类型的消息
            switch (type) {
                case "ping":
                    // 心跳响应
                    sendMessage(session, createMessage("pong", "pong", null));
                    break;
                case "register":
                    // 注册消息
                    String userId = (String) messageData.get("userId");
                    log.info("客户端注册，sessionId: {}, userId: {}", sessionId, userId);
                    sendMessage(session, createMessage("registered", "注册成功", null));
                    break;
                case "subscribe":
                    // 订阅消息（模拟STOMP订阅）
                    String destination = (String) messageData.get("destination");
                    log.info("客户端订阅，sessionId: {}, destination: {}", sessionId, destination);
                    sendMessage(session, createMessage("subscribed", "订阅成功", destination));
                    break;
                default:
                    log.warn("未知消息类型: {}", type);
            }
        } catch (Exception e) {
            log.error("处理消息失败: {}", e.getMessage(), e);
            sendMessage(session, createMessage("error", "消息处理失败: " + e.getMessage(), null));
        }
    }

    /**
     * 连接关闭时调用
     */
    @OnClose
    public void onClose(Session session) {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        log.info("WebSocket连接已关闭，sessionId: {}, 剩余连接数: {}", sessionId, sessions.size());
    }

    /**
     * 发生错误时调用
     */
    @OnError
    public void onError(Session session, Throwable error) {
        String sessionId = session != null ? session.getId() : "unknown";
        log.error("WebSocket发生错误，sessionId: {}", sessionId, error);
        
        if (session != null && session.isOpen()) {
            try {
                session.close();
            } catch (IOException e) {
                log.error("关闭session失败: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * 广播消息到所有连接的客户端
     */
    public static void broadcastMessage(String type, Object data) {
        String message = createMessage(type, data);
        broadcastToAll(message);
    }

    /**
     * 广播消息到指定会话
     */
    public static void broadcastToSession(String sessionId, String type, Object data) {
        Session session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            sendMessage(session, createMessage(type, data));
        }
    }

    /**
     * 广播消息到所有客户端
     */
    private static void broadcastToAll(String message) {
        if (message == null) {
            return;
        }
        
        sessions.values().forEach(session -> {
            if (session.isOpen()) {
                sendMessage(session, message);
            }
        });
        
        if (!sessions.isEmpty()) {
            log.debug("广播消息完成，目标连接数: {}", sessions.size());
        }
    }

    /**
     * 发送消息到指定会话
     */
    private static void sendMessage(Session session, String message) {
        if (session == null || !session.isOpen()) {
            return;
        }
        
        try {
            session.getBasicRemote().sendText(message);
        } catch (IOException e) {
            log.error("发送消息失败: {}", e.getMessage(), e);
            try {
                session.close();
            } catch (IOException ex) {
                log.error("关闭session失败: {}", ex.getMessage(), ex);
            }
        }
    }

    /**
     * 创建消息（简单格式）
     */
    private static String createMessage(String type, Object data) {
        try {
            Map<String, Object> message = new ConcurrentHashMap<>();
            message.put("type", type);
            message.put("data", data);
            message.put("timestamp", System.currentTimeMillis());
            return objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            log.error("创建消息失败: {}", e.getMessage(), e);
            return "{\"type\":\"error\",\"data\":\"消息创建失败\"}";
        }
    }

    /**
     * 创建消息（带文本）
     */
    private static String createMessage(String type, String text, String destination) {
        try {
            Map<String, Object> message = new ConcurrentHashMap<>();
            message.put("type", type);
            message.put("message", text);
            if (destination != null) {
                message.put("destination", destination);
            }
            message.put("timestamp", System.currentTimeMillis());
            return objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            log.error("创建消息失败: {}", e.getMessage(), e);
            return "{\"type\":\"error\",\"message\":\"消息创建失败\"}";
        }
    }

    /**
     * 获取当前连接数
     */
    public static int getConnectionCount() {
        return sessions.size();
    }

    /**
     * 获取所有会话ID
     */
    public static Map<String, Session> getSessions() {
        return new ConcurrentHashMap<>(sessions);
    }
}
