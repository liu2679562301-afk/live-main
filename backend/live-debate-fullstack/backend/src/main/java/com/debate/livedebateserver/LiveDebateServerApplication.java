package com.debate.livedebateserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.debate.livedebateserver.config.MinioConfig;

/**
 * 直播辩论小程序后端主启动类
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@SpringBootApplication
@EnableScheduling
public class LiveDebateServerApplication {

    /**
     * 主方法，Spring Boot应用入口
     * 
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(LiveDebateServerApplication.class, args);
    }

    /**
     * 配置全局CORS跨域支持
     * 允许所有来源、所有方法、所有请求头
     * 适用于前后端分离架构
     * @return WebMvcConfigurer对象，包含CORS配置
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // 配置全局CORS映射
                registry.addMapping("/**")
                        // 允许所有来源
                        .allowedOrigins("*")
                        // 允许所有HTTP方法
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        // 允许所有请求头
                        .allowedHeaders("*")
                        // 不允许携带凭证（设置为true时origins不能为*）
                        .allowCredentials(false)
                        // 预检请求缓存时间（秒）
                        .maxAge(3600);
            }
        };
    }
}
