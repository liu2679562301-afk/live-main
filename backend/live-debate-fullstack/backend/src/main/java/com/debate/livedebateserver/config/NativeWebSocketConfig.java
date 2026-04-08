package com.debate.livedebateserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

/**
 * 原生WebSocket配置类
 * 启用@ServerEndpoint注解支持
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-08
 */
@Configuration
public class NativeWebSocketConfig {

    /**
     * 自动注册@ServerEndpoint注解声明的WebSocket端点
     */
    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        return new ServerEndpointExporter();
    }
}
