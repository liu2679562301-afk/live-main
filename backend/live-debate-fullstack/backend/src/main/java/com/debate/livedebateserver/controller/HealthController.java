package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 健康检查控制器
 * 用于监控服务状态和 Railway 健康检查
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-08
 */
@Slf4j
@RestController
@RequestMapping("/")
public class HealthController {

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 健康检查接口
     * 返回服务基本状态
     */
    @GetMapping("/")
    public ApiResponse<Map<String, Object>> healthCheck() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "UP");
        data.put("service", "live-debate-server");
        data.put("timestamp", LocalDateTime.now());
        data.put("message", "服务运行正常");

        return ApiResponse.success(data);
    }

    /**
     * 详细健康检查接口
     * 返回服务详细状态信息
     */
    @GetMapping("/health")
    public Map<String, Object> detailedHealthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());

        // 服务信息
        Map<String, Object> service = new HashMap<>();
        service.put("name", "live-debate-server");
        service.put("version", "1.0.0");
        service.put("uptime", System.currentTimeMillis());
        health.put("service", service);

        // WebSocket 状态
        Map<String, Object> websocket = new HashMap<>();
        websocket.put("enabled", messagingTemplate != null);
        websocket.put("status", messagingTemplate != null ? "CONNECTED" : "DISABLED");
        health.put("websocket", websocket);

        // 环境信息
        Map<String, Object> environment = new HashMap<>();
        environment.put("javaVersion", System.getProperty("java.version"));
        environment.put("springProfiles", System.getenv("SPRING_PROFILES_ACTIVE"));
        health.put("environment", environment);

        return health;
    }

    /**
     * 就绪检查接口
     * 用于判断服务是否准备好接收请求
     */
    @GetMapping("/ready")
    public Map<String, Object> readinessCheck() {
        Map<String, Object> ready = new HashMap<>();
        ready.put("status", "READY");
        ready.put("timestamp", LocalDateTime.now());
        ready.put("message", "服务已就绪，可以接收请求");
        return ready;
    }
}
