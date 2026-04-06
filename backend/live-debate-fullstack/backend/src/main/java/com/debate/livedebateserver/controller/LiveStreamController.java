package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.model.LiveStream;
import com.debate.livedebateserver.service.MockDataService;
import com.debate.livedebateserver.service.WebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 直播流管理控制器
 * 提供直播流的CRUD管理接口（管理端专用），包括：
 * 获取所有直播流列表
 * 新增直播流
 * 更新直播流信息
 * 删除直播流
 * API路径前缀：/api，所有接口均为v1版本管理端接口
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LiveStreamController {

    /** 直播流数据服务 */
    @Autowired
    private MockDataService mockDataService;

    /** WebSocket服务，用于广播观看人数更新 */
    @Autowired
    private WebSocketService webSocketService;

    /**
     * 获取所有直播流列表
     * 返回全部直播流信息，并将url字段同步到streamUrl供前端使用
     *
     * @return 直播流列表
     */
    @GetMapping("/v1/admin/streams")
    public ApiResponse<List<LiveStream>> getAllStreams() {
        List<LiveStream> streams = mockDataService.getAllStreams();

        // 将播放地址同步到streamUrl字段
        streams.forEach(stream -> {
            stream.setStreamUrl(stream.getUrl());
        });

        return ApiResponse.success(streams);
    }

    /**
     * 新增直播流
     * 自动生成直播流ID和创建/更新时间戳
     *
     * @param stream 直播流信息（名称、地址、类型、描述等）
     * @return 创建成功的直播流对象
     */
    @PostMapping("/v1/admin/streams")
    public ApiResponse<LiveStream> addStream(@RequestBody LiveStream stream) {
        mockDataService.addStream(stream);
        return ApiResponse.success(stream);
    }

    /**
     * 更新直播流信息
     * 根据路径中的ID更新对应直播流的名称、地址、类型、描述等字段
     *
     * @param id     直播流ID（路径参数）
     * @param stream 新的直播流信息
     * @return 更新后的直播流对象
     */
    @PutMapping("/v1/admin/streams/{id}")
    public ApiResponse<LiveStream> updateStream(@PathVariable String id, @RequestBody LiveStream stream) {
        mockDataService.updateStream(id, stream);
        return ApiResponse.success(stream);
    }

    /**
     * 删除直播流
     *
     * @param id 直播流ID（路径参数）
     * @return 删除成功响应
     */
    @DeleteMapping("/v1/admin/streams/{id}")
    public ApiResponse<Void> deleteStream(@PathVariable String id) {
        mockDataService.deleteStream(id);
        return ApiResponse.success(null);
    }

    /**
     * 更新直播流信息（旧版接口）
     * 兼容旧版路径：/api/admin/streams/{streamId}
     *
     * @param streamId 直播流ID（路径参数）
     * @param stream 新的直播流信息
     * @return 更新后的直播流对象
     */
    @PutMapping("/admin/streams/{streamId}")
    public ApiResponse<LiveStream> updateStreamLegacy(@PathVariable String streamId, @RequestBody LiveStream stream) {
        mockDataService.updateStream(streamId, stream);
        return ApiResponse.success(stream);
    }

    /**
     * 删除直播流（旧版接口）
     * 兼容旧版路径：/api/admin/streams/{streamId}
     *
     * @param streamId 直播流ID（路径参数）
     * @return 删除成功响应
     */
    @DeleteMapping("/admin/streams/{streamId}")
    public ApiResponse<Void> deleteStreamLegacy(@PathVariable String streamId) {
        mockDataService.deleteStream(streamId);
        return ApiResponse.success(null);
    }

    /**
     * 切换直播流启用状态
     * POST /api/admin/streams/{streamId}/toggle
     *
     * @param streamId 直播流ID（路径参数）
     * @return 切换后的直播流对象
     */
    @PostMapping("/admin/streams/{streamId}/toggle")
    public ApiResponse<LiveStream> toggleStream(@PathVariable String streamId) {
        LiveStream stream = mockDataService.getStreamById(streamId);
        if (stream != null) {
            Boolean enabled = stream.getEnabled();
            stream.setEnabled(enabled == null ? true : !enabled);
            mockDataService.updateStream(streamId, stream);
            return ApiResponse.success(stream);
        }
        return ApiResponse.error("Stream not found");
    }

    /**
     * 获取观看人数（指定流或全部）
     * GET /api/v1/admin/live/viewers
     *
     * @param stream_id 直播流ID（可选）
     * @return 观看人数数据
     */
    @GetMapping("/v1/admin/live/viewers")
    public ApiResponse<Map<String, Object>> getViewers(@RequestParam(required = false) String stream_id) {
        Map<String, Object> result = new HashMap<>();
        result.put("timestamp", System.currentTimeMillis());
        
        // 模拟观看人数数据
        if (stream_id != null) {
            // 单个流
            result.put("streamId", stream_id);
            result.put("viewers", 156); // 模拟固定值
        } else {
            // 所有流
            List<LiveStream> streams = mockDataService.getAllStreams();
            Map<String, Integer> viewersMap = new HashMap<>();
            for (LiveStream stream : streams) {
                viewersMap.put(stream.getId(), 100 + (int)(Math.random() * 200)); // 随机模拟
            }
            result.put("allViewers", viewersMap);
            result.put("totalViewers", viewersMap.values().stream().mapToInt(Integer::intValue).sum());
        }
        return ApiResponse.success(result);
    }

    /**
     * 手动广播观看人数
     * POST /api/v1/admin/live/broadcast-viewers
     *
     * @param request 请求体（包含streamId）
     * @return 广播结果
     */
    @PostMapping("/v1/admin/live/broadcast-viewers")
    public ApiResponse<Map<String, Object>> broadcastViewers(@RequestBody Map<String, String> request) {
        String streamId = request.get("streamId");
        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("action", "broadcastViewers");
        result.put("message", "观看人数已广播");
        result.put("timestamp", System.currentTimeMillis());
        // 实际广播逻辑需配合WebSocket实现
        if (webSocketService != null && streamId != null) {
            // 模拟观看人数（实际应从实时数据源获取）
            int viewers = 156; // 可以改为从数据库或实时统计获取
            webSocketService.broadcastViewersUpdate(streamId, viewers);
            result.put("broadcastViewers", viewers);
        }
        return ApiResponse.success(result);
    }
}
