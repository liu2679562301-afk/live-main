package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.model.DebateTopic;
import com.debate.livedebateserver.service.MockDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 辩题控制器
 * 提供辩论主题相关的RESTful API接口，包括：
 * 获取当前辩题信息（支持旧版和v1版本）
 * 管理端查询辩题设置
 * 管理端更新辩题内容
 * API路径前缀：/api
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DebateController {

    /** 辩题数据服务 */
    @Autowired
    private MockDataService mockDataService;

    /**
     * 获取辩题信息（旧版接口）
     *
     * @param stream_id 直播流ID（可选，当前版本未使用）
     * @return 当前辩题对象
     */
    @GetMapping("/debate-topic")
    public ApiResponse<DebateTopic> getDebateTopic(@RequestParam(required = false) String stream_id) {
        DebateTopic topic = mockDataService.getDebateTopic();
        return ApiResponse.success(topic);
    }

    /**
     * 获取辩题信息（v1版本接口）
     *
     * @param stream_id 直播流ID（可选，当前版本未使用）
     * @return 当前辩题对象
     */
    @GetMapping("/v1/debate-topic")
    public ApiResponse<DebateTopic> getDebateTopicV1(@RequestParam(required = false) String stream_id) {
        DebateTopic topic = mockDataService.getDebateTopic();
        return ApiResponse.success(topic);
    }

    /**
     * 管理端获取辩题设置
     *
     * @return 当前辩题对象
     */
    @GetMapping("/admin/debate")
    public ApiResponse<DebateTopic> getDebateSettings() {
        return ApiResponse.success(mockDataService.getDebateTopic());
    }

    /**
     * 管理端更新辩题内容
     * 可更新辩题的标题、描述、正反方立场等信息
     *
     * @param topic 新的辩题对象
     * @return 更新后的辩题对象
     */
    @PutMapping("/admin/debate")
    public ApiResponse<DebateTopic> updateDebateSettings(@RequestBody DebateTopic topic) {
        mockDataService.updateDebateTopic(topic);
        return ApiResponse.success(topic);
    }

    /**
     * 获取流关联的辩题（v1管理端接口）
     * 
     * @param streamId 直播流ID（路径参数）
     * @return 辩题对象
     */
    @GetMapping("/v1/admin/streams/{streamId}/debate")
    public ApiResponse<DebateTopic> getStreamDebate(@PathVariable String streamId) {
        // 当前版本所有流共享同一个辩题
        return ApiResponse.success(mockDataService.getDebateTopic());
    }

    /**
     * 关联辩题到直播流（v1管理端接口）
     * 
     * @param streamId 直播流ID（路径参数）
     * @param topic 辩题对象
     * @return 关联成功响应
     */
    @PutMapping("/v1/admin/streams/{streamId}/debate")
    public ApiResponse<DebateTopic> associateStreamDebate(
            @PathVariable String streamId,
            @RequestBody DebateTopic topic) {
        // 更新全局辩题
        mockDataService.updateDebateTopic(topic);
        return ApiResponse.success(topic);
    }

    /**
     * 删除流关联的辩题（v1管理端接口）
     * 
     * @param streamId 直播流ID（路径参数）
     * @return 删除成功响应
     */
    @DeleteMapping("/v1/admin/streams/{streamId}/debate")
    public ApiResponse<Void> deleteStreamDebate(@PathVariable String streamId) {
        // 重置为默认辩题
        DebateTopic defaultTopic = DebateTopic.builder()
                .id("debate-001")
                .title("如果有一个能一键消除痛苦的按钮，你会按吗？")
                .description("这是一个关于痛苦、成长与人性选择的深度辩论")
                .leftPosition("会按")
                .rightPosition("不会按")
                .build();
        mockDataService.updateDebateTopic(defaultTopic);
        return ApiResponse.success(null);
    }

    /**
     * 创建新辩题（v1管理端接口）
     * 
     * @param topic 辩题信息
     * @return 创建成功的辩题对象
     */
    @PostMapping("/v1/admin/debates")
    public ApiResponse<DebateTopic> createDebate(@RequestBody DebateTopic topic) {
        // 生成唯一ID
        topic.setId("debate-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        mockDataService.updateDebateTopic(topic);
        return ApiResponse.success(topic);
    }

    /**
     * 更新辩题信息（v1管理端接口）
     * 
     * @param debateId 辩题ID（路径参数）
     * @param topic 新的辩题信息
     * @return 更新后的辩题对象
     */
    @PutMapping("/v1/admin/debates/{debateId}")
    public ApiResponse<DebateTopic> updateDebate(
            @PathVariable String debateId,
            @RequestBody DebateTopic topic) {
        topic.setId(debateId);
        mockDataService.updateDebateTopic(topic);
        return ApiResponse.success(topic);
    }

    /**
     * 获取单个辩题详情（v1管理端接口）
     * 
     * @param debateId 辩题ID（路径参数）
     * @return 辩题对象
     */
    @GetMapping("/v1/admin/debates/{debateId}")
    public ApiResponse<DebateTopic> getDebate(@PathVariable String debateId) {
        // 当前版本只有一个全局辩题，如果ID匹配则返回
        DebateTopic topic = mockDataService.getDebateTopic();
        if (topic != null && debateId.equals(topic.getId())) {
            return ApiResponse.success(topic);
        }
        return ApiResponse.error("Debate not found");
    }
}
