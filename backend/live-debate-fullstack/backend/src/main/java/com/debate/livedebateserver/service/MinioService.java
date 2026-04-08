package com.debate.livedebateserver.service;

import io.minio.*;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;
import io.minio.messages.Bucket;
import io.minio.messages.Item;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Minio服务类
 * 封装Minio对象存储操作，包括上传、下载、预签名URL生成等
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-04
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucketName;

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.secure:false}")
    private boolean secure;

    /** 默认预签名URL过期时间（分钟）：7天 */
    private static final int DEFAULT_EXPIRY_MINUTES = 7 * 24 * 60;
    
    /** MinIO是否可用 */
    private boolean minioAvailable = false;

    /**
     * 初始化，确保Bucket存在
     */
    @PostConstruct
    public void init() {
        // 检查是否禁用MinIO
        if (endpoint == null || endpoint.isEmpty() || "false".equalsIgnoreCase(endpoint)) {
            log.warn("MinIO endpoint未配置或已禁用，MinIO服务将不可用");
            this.minioAvailable = false;
            return;
        }
        
        log.info("初始化Minio服务，endpoint: {}, bucket: {}", endpoint, bucketName);
        try {
            // 测试连接
            log.info("测试Minio连接...");
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                log.info("Bucket不存在，创建Bucket: {}", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                // 设置Bucket策略为私有（默认就是私有，但可以显式设置）
                log.info("Bucket创建成功: {}", bucketName);
            } else {
                log.info("Bucket已存在: {}", bucketName);
                // 列出bucket中的对象数量（调试用）
                try {
                    int count = 0;
                    Iterable<Result<Item>> items = minioClient.listObjects(ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .recursive(true)
                            .build());
                    for (Result<Item> item : items) {
                        count++;
                        if (count <= 5) { // 只打印前5个对象
                            log.info("Bucket中的对象 {}: {}", count, item.get().objectName());
                        }
                    }
                    log.info("Bucket '{}' 中共有 {} 个对象", bucketName, count);
                } catch (Exception e) {
                    log.warn("无法列出bucket对象: {}", e.getMessage());
                }
            }
            log.info("Minio服务初始化成功");
            this.minioAvailable = true;
        } catch (Exception e) {
            log.error("初始化Minio Bucket失败: endpoint={}, bucket={}, error={}", endpoint, bucketName, e.getMessage(), e);
            // 在Railway环境中，MinIO连接失败时不抛出异常，让应用继续启动
            String environment = System.getenv("RAILWAY_ENVIRONMENT");
            if (environment != null && environment.equals("production")) {
                log.warn("生产环境MinIO连接失败，但应用将继续启动（MinIO功能将被禁用）");
                this.minioAvailable = false;
            } else {
                throw new RuntimeException("Minio Bucket初始化失败", e);
            }
        }
    }
    
    /**
     * 检查MinIO是否可用
     */
    private void checkMinioAvailable() {
        if (!minioAvailable) {
            throw new IllegalStateException("MinIO服务未初始化或已禁用");
        }
    }
    
    /**
     * 检查MinIO是否可用（返回布尔值，不抛出异常）
     */
    public boolean isAvailable() {
        return minioAvailable;
    }

    /**
     * 上传文件到Minio
     *
     * @param file       上传的文件
     * @param objectKey  对象键（路径）
     * @param metadata   自定义元数据
     * @return 对象键
     */
    public String uploadFile(MultipartFile file, String objectKey, Map<String, String> metadata) {
        // 检查MinIO是否可用
        checkMinioAvailable();
        
        try {
            // 确保objectKey不为空
            if (objectKey == null || objectKey.trim().isEmpty()) {
                objectKey = file.getOriginalFilename();
            }

            // 构建元数据
            Map<String, String> headers = new HashMap<>();
            if (metadata != null) {
                headers.putAll(metadata);
            }
            // 添加文件类型
            headers.put("Content-Type", file.getContentType());

            // 上传文件
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .headers(headers)
                            .build()
            );

            log.info("文件上传成功: bucket={}, objectKey={}, size={}", bucketName, objectKey, file.getSize());
            return objectKey;
        } catch (Exception e) {
            log.error("文件上传失败: {}", e.getMessage(), e);
            throw new RuntimeException("文件上传失败", e);
        }
    }

    /**
     * 上传文件到Minio（简化版）
     *
     * @param file      上传的文件
     * @param objectKey 对象键
     * @return 对象键
     */
    public String uploadFile(MultipartFile file, String objectKey) {
        return uploadFile(file, objectKey, null);
    }

    /**
     * 生成文件的预签名URL（用于临时访问私有文件）
     *
     * @param objectKey 对象键
     * @param expiry    过期时间（分钟）
     * @return 预签名URL
     */
    public String generatePresignedUrl(String objectKey, int expiry) {
        try {
            // 检查对象是否存在
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());

            // 生成预签名URL
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectKey)
                            .expiry(expiry, TimeUnit.MINUTES)
                            .build()
            );

            log.debug("生成预签名URL: objectKey={}, expiry={}分钟", objectKey, expiry);
            return url;
        } catch (ErrorResponseException e) {
            log.error("对象不存在: {}", objectKey);
            throw new RuntimeException("对象不存在: " + objectKey, e);
        } catch (Exception e) {
            log.error("生成预签名URL失败: {}", e.getMessage(), e);
            throw new RuntimeException("生成预签名URL失败", e);
        }
    }

    /**
     * 生成文件的预签名URL（默认过期时间7天）
     *
     * @param objectKey 对象键
     * @return 预签名URL
     */
    public String generatePresignedUrl(String objectKey) {
        // 默认7天过期
        return generatePresignedUrl(objectKey, DEFAULT_EXPIRY_MINUTES);
    }

    /**
     * 检查对象是否存在
     *
     * @param objectKey 对象键
     * @return 是否存在
     */
    public boolean objectExists(String objectKey) {
        // 检查MinIO是否可用
        if (!minioAvailable) {
            log.warn("MinIO服务未初始化，无法检查对象是否存在: {}", objectKey);
            return false;
        }
        
        try {
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
            return true;
        } catch (io.minio.errors.ErrorResponseException e) {
            // 对象不存在时返回false
            log.debug("对象不存在: {}", objectKey);
            return false;
        } catch (Exception e) {
            // 其他异常（如网络错误、权限问题）记录错误并返回false
            log.error("检查对象是否存在时出错: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 删除对象
     *
     * @param objectKey 对象键
     * @return 是否删除成功
     */
    public boolean deleteObject(String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
            log.info("对象删除成功: {}", objectKey);
            return true;
        } catch (Exception e) {
            log.error("对象删除失败: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 获取对象信息（大小、最后修改时间等）
     *
     * @param objectKey 对象键
     * @return 对象信息
     */
    public StatObjectResponse getObjectInfo(String objectKey) {
        try {
            return minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            log.error("获取对象信息失败: {}", e.getMessage(), e);
            throw new RuntimeException("获取对象信息失败", e);
        }
    }

    /**
     * 列出Bucket中的所有对象
     *
     * @param prefix 前缀过滤
     * @return 对象列表
     */
    public Iterable<Result<Item>> listObjects(String prefix) {
        log.info("列出Minio对象，bucket: {}, prefix: {}", bucketName, prefix);
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(ListObjectsArgs.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .recursive(true)
                    .build());
            log.info("Minio listObjects调用成功，bucket: {}, prefix: {}", bucketName, prefix);
            return results;
        } catch (Exception e) {
            log.error("列出对象失败: bucket={}, prefix={}, error={}", bucketName, prefix, e.getMessage(), e);
            throw new RuntimeException("列出对象失败", e);
        }
    }

    /**
     * 获取Bucket的公开访问URL（如果配置了公有访问）
     * 注意：本系统使用私有Bucket，此方法仅用于测试或特殊情况
     *
     * @param objectKey 对象键
     * @return 公开URL
     */
    public String getPublicUrl(String objectKey) {
        if (secure) {
            return "https://" + endpoint.replace("https://", "").replace("http://", "") + "/" + bucketName + "/" + objectKey;
        } else {
            return "http://" + endpoint.replace("https://", "").replace("http://", "") + "/" + bucketName + "/" + objectKey;
        }
    }

    /**
     * 上传字节数组到Minio
     *
     * @param objectKey 对象键（路径）
     * @param data      文件数据字节数组
     * @param contentType 内容类型（可选，默认为application/octet-stream）
     * @return 对象键
     */
    public String uploadObject(String objectKey, byte[] data, String contentType) {
        try {
            if (data == null || data.length == 0) {
                throw new IllegalArgumentException("文件数据不能为空");
            }
            
            // 设置默认内容类型
            if (contentType == null || contentType.isEmpty()) {
                contentType = "application/octet-stream";
            }
            
            // 创建自定义元数据
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", contentType);
            
            // 上传文件
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(data), data.length, -1)
                            .contentType(contentType)
                            .headers(headers)
                            .build()
            );
            
            log.info("字节数组上传成功: bucket={}, objectKey={}, size={} bytes", bucketName, objectKey, data.length);
            return objectKey;
        } catch (Exception e) {
            log.error("字节数组上传失败: bucket={}, objectKey={}, error={}", bucketName, objectKey, e.getMessage(), e);
            throw new RuntimeException("文件上传失败", e);
        }
    }

    /**
     * 上传字节数组到Minio（使用默认内容类型）
     *
     * @param objectKey 对象键（路径）
     * @param data      文件数据字节数组
     * @return 对象键
     */
    public String uploadObject(String objectKey, byte[] data) {
        return uploadObject(objectKey, data, "application/octet-stream");
    }
}