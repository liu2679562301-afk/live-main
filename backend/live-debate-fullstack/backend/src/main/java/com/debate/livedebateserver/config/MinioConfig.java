package com.debate.livedebateserver.config;

import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Minio配置类
 * 配置Minio客户端Bean，连接本地Docker Minio服务
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-04
 */
@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.region}")
    private String region;

    @Value("${minio.secure:false}")
    private boolean secure;

    /**
     * 创建MinioClient Bean
     * 用于上传、下载、管理Minio对象存储
     *
     * @return MinioClient实例
     */
    @Bean
    public MinioClient minioClient() {
        try {
            log.info("初始化Minio客户端，endpoint: {}, bucket: {}, region: {}", endpoint, bucket, region);
            return MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .region(region)
                    .build();
        } catch (Exception e) {
            log.error("Minio客户端初始化失败: {}", e.getMessage(), e);
            throw new RuntimeException("Minio客户端初始化失败", e);
        }
    }
}