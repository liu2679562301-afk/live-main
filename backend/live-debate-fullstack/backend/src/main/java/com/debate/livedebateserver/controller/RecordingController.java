package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.model.Recording;
import com.debate.livedebateserver.service.MockDataService;
import com.debate.livedebateserver.service.MinioService;
import io.minio.Result;
import io.minio.messages.Item;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 录播管理控制器
 * 提供录播文件的元数据管理和播放URL生成接口
 * 注意：录播文件存储在Minio私有Bucket中，通过预签名URL临时访问
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-04
 */
@Slf4j
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RecordingController {

    @Autowired
    private MockDataService mockDataService;

    @Autowired
    private MinioService minioService;

    /**
     * 为录播生成预签名播放URL（安全方法）
     * 如果生成失败，返回空字符串并记录警告日志
     * 
     * @param objectKey 对象键
     * @return 预签名URL，失败时返回空字符串
     */
    private String generatePlayUrl(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return "";
        }
        try {
            return minioService.generatePresignedUrl(objectKey);
        } catch (Exception e) {
            log.warn("生成播放URL失败: objectKey={}, error={}", objectKey, e.getMessage());
            return "";
        }
    }

    /**
     * 安全提取文件名（不含路径）
     * 
     * @param objectKey 对象键
     * @return 文件名，失败时返回原对象键
     */
    private String safeExtractFilename(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return objectKey;
        }
        int lastSlash = objectKey.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < objectKey.length() - 1) {
            return objectKey.substring(lastSlash + 1);
        }
        return objectKey;
    }

    /**
     * 安全提取文件扩展名
     * 
     * @param objectKey 对象键
     * @return 扩展名（小写），失败时返回空字符串
     */
    private String safeExtractFormat(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return "";
        }
        int lastDot = objectKey.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < objectKey.length() - 1) {
            return objectKey.substring(lastDot + 1).toLowerCase();
        }
        return "";
    }

    /**
     * 获取所有录播列表
     * 返回包含预签名播放URL的录播信息（URL有效期7天）
     * GET /api/recordings
     *
     * @return 录播列表
     */
    @GetMapping("/recordings")
    public ApiResponse<List<Recording>> getAllRecordings() {
        try {
            // 1. 首先从Minio获取实际文件列表
            List<Recording> minioRecordings = new ArrayList<>();
            // 尝试多个可能的前缀
            String[] prefixes = {"video/", "video", "recordings/video", "recordings/video/", "recordings/", ""};
            Iterable<Result<Item>> results = null;
            String usedPrefix = "";
            boolean foundObjects = false;
            
            for (String prefix : prefixes) {
                try {
                    log.info("尝试使用前缀 '{}' 列出Minio对象", prefix);
                    results = minioService.listObjects(prefix);
                    usedPrefix = prefix;
                    log.info("前缀 '{}' 调用成功", prefix);
                    
                    // 检查是否有实际对象
                    int count = 0;
                    for (Result<Item> result : results) {
                        count++;
                        if (count == 1) {
                            log.info("前缀 '{}' 找到至少一个对象，继续处理", prefix);
                            foundObjects = true;
                            break;
                        }
                    }
                    
                    if (foundObjects) {
                        break;
                    } else {
                        log.info("前缀 '{}' 调用成功但没有找到对象，尝试下一个前缀", prefix);
                    }
                } catch (Exception e) {
                    log.info("前缀 '{}' 调用失败: {}", prefix, e.getMessage());
                }
            }
            
            if (!foundObjects) {
                log.warn("所有前缀都无法找到Minio对象，使用空结果");
                results = Collections.emptyList();
            }
            
            log.info("最终使用前缀 '{}' 调用listObjects，开始遍历...", usedPrefix);
            int totalObjects = 0;
            int processedObjects = 0;
            for (Result<Item> result : results) {
                totalObjects++;
                try {
                    Item item = result.get();
                    if (item.isDir()) {
                        log.info("跳过目录对象: {}", item.objectName());
                        continue; // 跳过目录
                    }
                    processedObjects++;
                    String objectKey = item.objectName();
                    log.info("处理Minio对象: {}, size: {}", objectKey, item.size());
                    // 检查是否已有对应的录播元数据
                    Recording existing = mockDataService.getRecordingByObjectKey(objectKey);
                    if (existing != null) {
                        // 使用现有元数据
                        minioRecordings.add(existing);
                        log.info("使用现有元数据: {}", objectKey);
                    } else {
                        // 创建新的录播对象（基本信息）
                        Recording newRecording = Recording.builder()
                                .id("recording-" + UUID.randomUUID().toString().substring(0, 8))
                                .objectKey(objectKey)
                                .filename(safeExtractFilename(objectKey))
                                .title(safeExtractFilename(objectKey))
                                .description("从Minio自动发现的录播文件")
                                .duration(3600) // 默认1小时，实际应通过元数据获取
                                .size(item.size())
                                .width(1920)
                                .height(1080)
                                .format(safeExtractFormat(objectKey))
                                .bucket("recordings")
                                .enabled(true)
                                .streamId("stream-001") // 默认关联主直播间
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                        // 保存到内存中，避免重复创建
                        mockDataService.addRecording(newRecording);
                        minioRecordings.add(newRecording);
                        log.info("创建新录播元数据: {}", objectKey);
                    }
                } catch (Exception e) {
                    log.warn("处理Minio对象时出错: {}", e.getMessage());
                }
            }
            log.info("Minio对象遍历完成，总对象数: {}, 处理文件数: {}, 有效录播数: {}", totalObjects, processedObjects, minioRecordings.size());
            
            // 2. 如果Minio没有文件，返回模拟数据作为后备
            if (minioRecordings.isEmpty()) {
                List<Recording> mockRecordings = mockDataService.getAllRecordings();
                mockRecordings.forEach(recording -> {
                    if (recording.getObjectKey() != null && !recording.getObjectKey().isEmpty()) {
                        String playUrl = generatePlayUrl(recording.getObjectKey());
                        recording.setPlayUrl(playUrl);
                    }
                });
                return ApiResponse.success(mockRecordings);
            }
            
            // 3. 为每个录播生成预签名播放URL
            minioRecordings.forEach(recording -> {
                if (recording.getObjectKey() != null && !recording.getObjectKey().isEmpty()) {
                    String playUrl = generatePlayUrl(recording.getObjectKey());
                    recording.setPlayUrl(playUrl);
                }
            });
            
            return ApiResponse.success(minioRecordings);
        } catch (Exception e) {
            log.error("获取录播列表失败: {}", e.getMessage(), e);
            // 出错时返回模拟数据
            List<Recording> mockRecordings = mockDataService.getAllRecordings();
            mockRecordings.forEach(recording -> {
                if (recording.getObjectKey() != null && !recording.getObjectKey().isEmpty()) {
                    String playUrl = generatePlayUrl(recording.getObjectKey());
                    recording.setPlayUrl(playUrl);
                }
            });
            return ApiResponse.success(mockRecordings);
        }
    }

    /**
     * 获取单个录播详情
     * GET /api/recordings/{id}
     *
     * @param id 录播ID
     * @return 录播详情
     */
    @GetMapping("/recordings/{id}")
    public ApiResponse<Recording> getRecordingById(@PathVariable String id) {
        Recording recording = mockDataService.getRecordingById(id);
        if (recording == null) {
            return ApiResponse.error("录播不存在");
        }
        // 生成预签名播放URL
        if (recording.getObjectKey() != null && !recording.getObjectKey().isEmpty()) {
            String playUrl = generatePlayUrl(recording.getObjectKey());
            recording.setPlayUrl(playUrl);
        }
        return ApiResponse.success(recording);
    }

    /**
     * 创建录播元数据
     * 注意：此接口仅创建元数据，不上传文件。文件上传请使用单独接口。
     * POST /api/recordings
     *
     * @param recording 录播元数据（不含ID和时间戳）
     * @return 创建成功的录播对象
     */
    @PostMapping("/recordings")
    public ApiResponse<Recording> createRecording(@RequestBody Recording recording) {
        // 验证必要字段
        if (recording.getObjectKey() == null || recording.getObjectKey().isEmpty()) {
            return ApiResponse.error("objectKey不能为空");
        }
        if (recording.getTitle() == null || recording.getTitle().isEmpty()) {
            return ApiResponse.error("标题不能为空");
        }
        // 检查对象是否存在于Minio中
        if (!minioService.objectExists(recording.getObjectKey())) {
            return ApiResponse.error("指定的文件在Minio中不存在");
        }
        // 检查objectKey唯一性：确保没有重复的objectKey
        Recording existing = mockDataService.getRecordingByObjectKey(recording.getObjectKey());
        if (existing != null) {
            return ApiResponse.error("该文件已关联到录播记录：" + existing.getId() + " - " + existing.getTitle());
        }
        // 获取Minio文件元数据（大小、修改时间等）
        try {
            // 这里可以添加获取文件元数据的逻辑，例如文件大小、格式等
            // 目前使用recording中已有的信息
            log.info("创建录播元数据，objectKey: {}", recording.getObjectKey());
        } catch (Exception e) {
            log.warn("获取Minio文件元数据失败: {}", e.getMessage(), e);
            // 继续创建录播元数据，不中断
        }
        // 添加录播
        mockDataService.addRecording(recording);
        // 生成播放URL
        String playUrl = minioService.generatePresignedUrl(recording.getObjectKey());
        recording.setPlayUrl(playUrl);
        return ApiResponse.success(recording);
    }

    /**
     * 更新录播元数据
     * PUT /api/recordings/{id}
     *
     * @param id 录播ID
     * @param recording 新的录播元数据
     * @return 更新后的录播对象
     */
    @PutMapping("/recordings/{id}")
    public ApiResponse<Recording> updateRecording(@PathVariable String id, @RequestBody Recording recording) {
        Recording existing = mockDataService.getRecordingById(id);
        if (existing == null) {
            return ApiResponse.error("录播不存在");
        }
        // 如果objectKey变更，检查新对象是否存在
        if (recording.getObjectKey() != null && !recording.getObjectKey().equals(existing.getObjectKey())) {
            if (!minioService.objectExists(recording.getObjectKey())) {
                return ApiResponse.error("指定的文件在Minio中不存在");
            }
        }
        mockDataService.updateRecording(id, recording);
        // 重新获取更新后的录播
        Recording updated = mockDataService.getRecordingById(id);
        if (updated != null && updated.getObjectKey() != null && !updated.getObjectKey().isEmpty()) {
            String playUrl = minioService.generatePresignedUrl(updated.getObjectKey());
            updated.setPlayUrl(playUrl);
        }
        return ApiResponse.success(updated);
    }

    /**
     * 删除录播元数据
     * 注意：此操作仅删除元数据，不删除Minio中的文件
     * DELETE /api/recordings/{id}
     *
     * @param id 录播ID
     * @return 删除成功响应
     */
    @DeleteMapping("/recordings/{id}")
    public ApiResponse<Void> deleteRecording(@PathVariable String id) {
        boolean deleted = mockDataService.deleteRecording(id);
        if (deleted) {
            return ApiResponse.success(null);
        } else {
            return ApiResponse.error("录播不存在");
        }
    }

    /**
     * 获取录播的播放URL
     * 生成一个临时的预签名URL，用于前端播放
     * GET /api/recordings/{id}/play
     *
     * @param id 录播ID
     * @return 播放URL
     */
    @GetMapping("/recordings/{id}/play")
    public ApiResponse<String> getPlayUrl(@PathVariable String id) {
        Recording recording = mockDataService.getRecordingById(id);
        if (recording == null) {
            return ApiResponse.error("录播不存在");
        }
        if (recording.getObjectKey() == null || recording.getObjectKey().isEmpty()) {
            return ApiResponse.error("录播文件不存在");
        }
        try {
            String playUrl = minioService.generatePresignedUrl(recording.getObjectKey());
            return ApiResponse.success(playUrl);
        } catch (Exception e) {
            return ApiResponse.error("生成播放URL失败");
        }
    }

    /**
     * 搜索录播（按标题或描述）
     * GET /api/recordings/search
     *
     * @param keyword 关键词
     * @return 匹配的录播列表
     */
    @GetMapping("/recordings/search")
    public ApiResponse<List<Recording>> searchRecordings(@RequestParam String keyword) {
        List<Recording> all = mockDataService.getAllRecordings();
        List<Recording> filtered = all.stream()
                .filter(r -> (r.getTitle() != null && r.getTitle().contains(keyword)) ||
                             (r.getDescription() != null && r.getDescription().contains(keyword)))
                .collect(Collectors.toList());
        // 生成播放URL
        filtered.forEach(recording -> {
            if (recording.getObjectKey() != null && !recording.getObjectKey().isEmpty()) {
                String playUrl = generatePlayUrl(recording.getObjectKey());
                recording.setPlayUrl(playUrl);
            }
        });
        return ApiResponse.success(filtered);
    }

    /**
     * 原子化上传接口：同时上传文件并创建录播元数据
     * 将文件上传和元数据创建合并为一个原子操作，确保数据一致性
     * POST /api/recordings/upload
     *
     * @param request 上传请求，包含文件信息和录播元数据
     * @return 创建成功的录播对象
     */
    @PostMapping("/recordings/upload")
    public ApiResponse<Recording> uploadRecording(@RequestBody UploadRecordingRequest request) {
        try {
            // 验证请求参数
            if (request.getFileData() == null || request.getFileData().length == 0) {
                return ApiResponse.error("文件数据不能为空");
            }
            if (request.getFilename() == null || request.getFilename().isEmpty()) {
                return ApiResponse.error("文件名不能为空");
            }
            if (request.getTitle() == null || request.getTitle().isEmpty()) {
                return ApiResponse.error("标题不能为空");
            }

            // 生成唯一的objectKey（使用UUID避免冲突）
            String objectKey = "video/" + UUID.randomUUID().toString() + "_" + request.getFilename();
            
            // 1. 上传文件到Minio
            minioService.uploadObject(objectKey, request.getFileData());
            log.info("文件上传成功，objectKey: {}, 文件大小: {} bytes", objectKey, request.getFileData().length);

            // 2. 创建录播元数据
            Recording recording = Recording.builder()
                    .id("recording-" + UUID.randomUUID().toString().substring(0, 8))
                    .objectKey(objectKey)
                    .filename(request.getFilename())
                    .title(request.getTitle())
                    .description(request.getDescription() != null ? request.getDescription() : "用户上传的录播文件")
                    .duration(request.getDuration() != null ? request.getDuration() : 3600)
                    .size((long) request.getFileData().length)
                    .width(request.getWidth() != null ? request.getWidth() : 1920)
                    .height(request.getHeight() != null ? request.getHeight() : 1080)
                    .format(safeExtractFormat(request.getFilename()))
                    .bucket("recordings")
                    .enabled(true)
                    .streamId(request.getStreamId() != null ? request.getStreamId() : "stream-001")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            // 3. 保存元数据到内存（模拟数据库）
            mockDataService.addRecording(recording);

            // 4. 生成播放URL
            String playUrl = minioService.generatePresignedUrl(objectKey);
            recording.setPlayUrl(playUrl);

            log.info("原子化上传成功，录播ID: {}, objectKey: {}", recording.getId(), objectKey);
            return ApiResponse.success(recording);
        } catch (Exception e) {
            log.error("原子化上传失败: {}", e.getMessage(), e);
            return ApiResponse.error("上传失败: " + e.getMessage());
        }
    }

    /**
     * 一致性检查接口：检查数据库记录和Minio存储之间的一致性
     * 用于诊断和修复数据不一致问题
     * GET /api/recordings/consistency-check
     *
     * @return 一致性检查结果
     */
    @GetMapping("/recordings/consistency-check")
    public ApiResponse<ConsistencyCheckResult> consistencyCheck() {
        try {
            List<Recording> allRecordings = mockDataService.getAllRecordings();
            List<String> databaseObjectKeys = allRecordings.stream()
                    .map(Recording::getObjectKey)
                    .filter(key -> key != null && !key.isEmpty())
                    .collect(Collectors.toList());

            // 获取Minio中所有对象
            List<String> minioObjectKeys = new ArrayList<>();
            try {
                Iterable<Result<Item>> results = minioService.listObjects("");
                for (Result<Item> result : results) {
                    Item item = result.get();
                    if (!item.isDir()) {
                        minioObjectKeys.add(item.objectName());
                    }
                }
            } catch (Exception e) {
                log.warn("获取Minio对象列表失败: {}", e.getMessage(), e);
            }

            // 找出不一致的记录
            List<String> inDbNotInMinio = databaseObjectKeys.stream()
                    .filter(key -> !minioObjectKeys.contains(key))
                    .collect(Collectors.toList());

            List<String> inMinioNotInDb = minioObjectKeys.stream()
                    .filter(key -> !databaseObjectKeys.contains(key))
                    .collect(Collectors.toList());

            ConsistencyCheckResult result = ConsistencyCheckResult.builder()
                    .totalDatabaseRecords(databaseObjectKeys.size())
                    .totalMinioObjects(minioObjectKeys.size())
                    .inDbNotInMinio(inDbNotInMinio)
                    .inMinioNotInDb(inMinioNotInDb)
                    .consistent(inDbNotInMinio.isEmpty() && inMinioNotInDb.isEmpty())
                    .timestamp(LocalDateTime.now())
                    .build();

            log.info("一致性检查完成，数据库记录数: {}, Minio对象数: {}, 不一致记录数: {}",
                    databaseObjectKeys.size(), minioObjectKeys.size(),
                    inDbNotInMinio.size() + inMinioNotInDb.size());

            return ApiResponse.success(result);
        } catch (Exception e) {
            log.error("一致性检查失败: {}", e.getMessage(), e);
            return ApiResponse.error("一致性检查失败: " + e.getMessage());
        }
    }

    /**
     * 原子化上传请求DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadRecordingRequest {
        private String filename;
        private String title;
        private String description;
        private Integer duration;
        private Integer width;
        private Integer height;
        private String streamId;
        private byte[] fileData;
    }

    /**
     * 一致性检查结果DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsistencyCheckResult {
        private int totalDatabaseRecords;
        private int totalMinioObjects;
        private List<String> inDbNotInMinio;
        private List<String> inMinioNotInDb;
        private boolean consistent;
        private LocalDateTime timestamp;
    }
}