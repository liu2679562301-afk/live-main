package com.debate.livedebateserver.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket消息广播器
 * 将STOMP协议的消息转发到原生WebSocket客户端
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-08
 */
@Slf4j
@Component
public class WebSocketMessageBroadcaster {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 初始化方法，将自己注册到NativeWebSocketHandler
     */
    @PostConstruct
    public void init() {
        NativeWebSocketHandler.setBroadcaster(this);
        log.info("WebSocketMessageBroadcaster初始化完成，已注册到NativeWebSocketHandler");
    }

    /**
     * 广播投票更新到原生WebSocket客户端
     */
    public void broadcastVoteUpdate(Integer leftVotes, Integer rightVotes, String streamId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "voteUpdate");
            data.put("leftVotes", leftVotes);
            data.put("rightVotes", rightVotes);
            if (streamId != null) {
                data.put("streamId", streamId);
            }
            data.put("timestamp", System.currentTimeMillis());

            String jsonMessage = objectMapper.writeValueAsString(data);
            NativeWebSocketHandler.broadcastMessage("voteUpdate", data);
            
            log.debug("投票更新已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播投票更新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 广播直播状态更新到原生WebSocket客户端
     */
    public void broadcastLiveStatus(Boolean isLive, String streamUrl, String streamId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "liveStatus");
            data.put("isLive", isLive);
            if (streamUrl != null) {
                data.put("streamUrl", streamUrl);
            }
            if (streamId != null) {
                data.put("streamId", streamId);
            }
            data.put("timestamp", System.currentTimeMillis());

            NativeWebSocketHandler.broadcastMessage("liveStatus", data);
            
            log.debug("直播状态更新已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播直播状态更新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 广播AI识别内容到原生WebSocket客户端
     */
    public void broadcastAIContent(String id, String text, String side, Long timestamp, String streamId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "aiContent");
            data.put("id", id);
            data.put("text", text);
            data.put("side", side);
            data.put("timestamp", timestamp);
            if (streamId != null) {
                data.put("streamId", streamId);
            }

            NativeWebSocketHandler.broadcastMessage("aiContent", data);
            
            log.debug("AI识别内容已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播AI识别内容失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 广播评论更新到原生WebSocket客户端
     */
    public void broadcastComment(String id, String contentId, String user, String text, 
                                   String avatar, Long timestamp, String streamId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "comment");
            data.put("id", id);
            data.put("contentId", contentId);
            data.put("user", user);
            data.put("text", text);
            data.put("avatar", avatar);
            data.put("timestamp", timestamp);
            if (streamId != null) {
                data.put("streamId", streamId);
            }

            NativeWebSocketHandler.broadcastMessage("comment", data);
            
            log.debug("评论更新已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播评论更新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 广播观看人数更新到原生WebSocket客户端
     */
    public void broadcastViewersUpdate(String streamId, Integer viewers) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "viewersUpdate");
            data.put("streamId", streamId);
            data.put("viewers", viewers);
            data.put("timestamp", System.currentTimeMillis());

            NativeWebSocketHandler.broadcastMessage("viewersUpdate", data);
            
            log.debug("观看人数更新已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播观看人数更新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 广播AI状态更新到原生WebSocket客户端
     */
    public void broadcastAIStatus(String status, String streamId) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "aiStatus");
            data.put("status", status);
            if (streamId != null) {
                data.put("streamId", streamId);
            }
            data.put("timestamp", System.currentTimeMillis());

            NativeWebSocketHandler.broadcastMessage("aiStatus", data);
            
            log.debug("AI状态更新已广播到原生WebSocket客户端，streamId: {}", streamId);
        } catch (Exception e) {
            log.error("广播AI状态更新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 定期发送心跳（供测试使用）
     */
    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        if (NativeWebSocketHandler.getConnectionCount() > 0) {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "heartbeat");
            data.put("message", "服务器心跳");
            data.put("timestamp", System.currentTimeMillis());
            data.put("connections", NativeWebSocketHandler.getConnectionCount());
            
            NativeWebSocketHandler.broadcastMessage("heartbeat", data);
        }
    }
}
