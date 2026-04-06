package com.debate.livedebateserver.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket服务类
 * 负责广播实时事件到所有连接的客户端
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Slf4j
@Service
public class WebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 广播投票更新事件
     * 
     * @param leftVotes 正方票数
     * @param rightVotes 反方票数
     * @param streamId 直播流ID（可选）
     */
    public void broadcastVoteUpdate(Integer leftVotes, Integer rightVotes, String streamId) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "voteUpdate");
        data.put("leftVotes", leftVotes);
        data.put("rightVotes", rightVotes);
        if (streamId != null) {
            data.put("streamId", streamId);
        }
        data.put("timestamp", System.currentTimeMillis());
        
        broadcast("/topic/vote-updates", data);
    }

    /**
     * 广播直播状态变化事件
     * 
     * @param isLive 是否直播中
     * @param streamUrl 直播流地址（可选）
     * @param streamId 直播流ID（可选）
     */
    public void broadcastLiveStatus(Boolean isLive, String streamUrl, String streamId) {
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
        
        broadcast("/topic/live-status", data);
    }

    /**
     * 广播AI识别状态变化事件
     * 
     * @param status 状态：stopped, running, paused
     * @param streamId 直播流ID（可选）
     */
    public void broadcastAIStatus(String status, String streamId) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "aiStatus");
        data.put("status", status);
        if (streamId != null) {
            data.put("streamId", streamId);
        }
        data.put("timestamp", System.currentTimeMillis());
        
        broadcast("/topic/ai-status", data);
    }

    /**
     * 广播新的AI识别内容事件
     * 
     * @param id 内容ID
     * @param text 内容文本
     * @param side 立场：left/right
     * @param timestamp 时间戳
     * @param streamId 直播流ID（可选）
     */
    public void broadcastAIContent(String id, String text, String side, Long timestamp, String streamId) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "aiContent");
        data.put("id", id);
        data.put("text", text);
        data.put("side", side);
        data.put("timestamp", timestamp);
        if (streamId != null) {
            data.put("streamId", streamId);
        }
        
        broadcast("/topic/ai-content", data);
    }

    /**
     * 广播新评论事件
     * 
     * @param id 评论ID
     * @param contentId AI内容ID
     * @param user 用户昵称
     * @param text 评论文本
     * @param avatar 用户头像URL
     * @param timestamp 时间戳
     * @param streamId 直播流ID（可选）
     */
    public void broadcastComment(String id, String contentId, String user, String text, String avatar, Long timestamp, String streamId) {
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
        
        broadcast("/topic/comments", data);
    }

    /**
     * 广播观看人数更新事件
     * 
     * @param streamId 直播流ID
     * @param viewers 观看人数
     */
    public void broadcastViewersUpdate(String streamId, Integer viewers) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "viewersUpdate");
        data.put("streamId", streamId);
        data.put("viewers", viewers);
        data.put("timestamp", System.currentTimeMillis());
        
        broadcast("/topic/viewers-updates", data);
    }

    /**
     * 通用广播方法
     * 
     * @param destination 目标路径
     * @param data 数据
     */
    private void broadcast(String destination, Object data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            messagingTemplate.convertAndSend(destination, data);
            log.debug("WebSocket广播成功: {} -> {}", destination, json.substring(0, Math.min(json.length(), 100)));
        } catch (JsonProcessingException e) {
            log.error("WebSocket广播JSON序列化失败: {}", e.getMessage());
        } catch (Exception e) {
            log.error("WebSocket广播失败: {}", e.getMessage());
        }
    }
}