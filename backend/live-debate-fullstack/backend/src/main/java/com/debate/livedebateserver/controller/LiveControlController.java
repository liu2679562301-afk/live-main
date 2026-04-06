package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.dto.LiveControlRequest;
import com.debate.livedebateserver.model.LiveStream;
import com.debate.livedebateserver.model.VoteData;
import com.debate.livedebateserver.service.MockDataService;
import com.debate.livedebateserver.service.WebSocketService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 直播控制控制器
 * 提供直播启停、状态查询、数据概览等管理接口
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Slf4j
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LiveControlController {

    @Autowired
    private MockDataService mockDataService;

    @Autowired
    private WebSocketService webSocketService;

    /**
     * 用户控制直播启停
     * 
     * @param request 控制请求（action: start/stop, streamId可选）
     * @return 操作结果
     */
    @PostMapping("/live/control")
    public ApiResponse<Map<String, Object>> userControlLive(@RequestBody LiveControlRequest request) {
        String action = request.getAction();
        String streamId = request.getStreamId();
        if (streamId == null) {
            // 使用默认流
            LiveStream active = mockDataService.getActiveStream();
            streamId = active != null ? active.getId() : "stream-001";
        }

        Map<String, Object> result = new HashMap<>();
        result.put("action", action);
        result.put("streamId", streamId);
        result.put("timestamp", LocalDateTime.now());

        if ("start".equalsIgnoreCase(action)) {
            mockDataService.setLiveStatus(streamId, true);
            result.put("message", "直播已开始");
            result.put("streamUrl", request.getStreamUrl());
        } else if ("stop".equalsIgnoreCase(action)) {
            mockDataService.setLiveStatus(streamId, false);
            result.put("message", "直播已停止");
        } else {
            return ApiResponse.error("无效的操作类型，仅支持 start/stop");
        }

        return ApiResponse.success(result);
    }

    /**
     * 获取直播状态（管理端）
     * 
     * @return 所有流的直播状态
     */
    @GetMapping("/admin/live/status")
    public ApiResponse<Map<String, Object>> getLiveStatus() {
        List<LiveStream> streams = mockDataService.getAllStreams();
        Map<String, Object> status = new HashMap<>();
        status.put("timestamp", LocalDateTime.now());
        Map<String, Boolean> streamStatus = new HashMap<>();
        for (LiveStream stream : streams) {
            Boolean isLive = mockDataService.getLiveStatus(stream.getId());
            streamStatus.put(stream.getId(), isLive);
        }
        status.put("streams", streamStatus);
        status.put("totalLive", streamStatus.values().stream().filter(Boolean::booleanValue).count());
        return ApiResponse.success(status);
    }

    /**
     * 数据概览（v1管理端）
     * 
     * @param stream_id 直播流ID（可选）
     * @return 数据概览信息
     */
    @GetMapping("/v1/admin/dashboard")
    public ApiResponse<Map<String, Object>> getDashboard(@RequestParam(required = false) String stream_id) {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("timestamp", LocalDateTime.now());

        // 直播状态
        List<LiveStream> streams = mockDataService.getAllStreams();
        dashboard.put("totalStreams", streams.size());
        long liveCount = streams.stream()
                .filter(s -> mockDataService.getLiveStatus(s.getId()))
                .count();
        dashboard.put("liveStreams", liveCount);

        // 投票数据
        VoteData voteData = mockDataService.getVoteData(stream_id);
        dashboard.put("votes", voteData);

        // AI内容数量
        List<com.debate.livedebateserver.model.AIContent> aiContents = mockDataService.getAIContents(stream_id);
        dashboard.put("aiContentCount", aiContents.size());

        // 辩题信息
        dashboard.put("debateTopic", mockDataService.getDebateTopic());

        return ApiResponse.success(dashboard);
    }

    /**
     * 后台开始直播
     * 
     * @param request 控制请求
     * @return 操作结果
     */
    @PostMapping("/v1/admin/live/start")
    public ApiResponse<Map<String, Object>> adminStartLive(@RequestBody LiveControlRequest request) {
        String streamId = request.getStreamId();
        if (streamId == null) {
            return ApiResponse.error("streamId不能为空");
        }
        mockDataService.setLiveStatus(streamId, true);
        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("status", "live");
        result.put("message", "直播已开始");
        result.put("autoStartAI", request.getAutoStartAI());
        result.put("notifyUsers", request.getNotifyUsers());
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     * 后台停止直播
     * 
     * @param request 控制请求
     * @return 操作结果
     */
    @PostMapping("/v1/admin/live/stop")
    public ApiResponse<Map<String, Object>> adminStopLive(@RequestBody LiveControlRequest request) {
        String streamId = request.getStreamId();
        if (streamId == null) {
            return ApiResponse.error("streamId不能为空");
        }
        mockDataService.setLiveStatus(streamId, false);
        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("status", "stopped");
        result.put("message", "直播已停止");
        result.put("saveStatistics", true);
        result.put("notifyUsers", request.getNotifyUsers());
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     * 重置投票数据
     * 
     * @param request 重置请求（包含streamId, resetTo等）
     * @return 重置后的投票数据
     */
    @PostMapping("/v1/admin/live/reset-votes")
    public ApiResponse<VoteData> resetVotes(@RequestBody Map<String, Object> request) {
        String streamId = (String) request.get("streamId");
        Map<String, Integer> resetTo = (Map<String, Integer>) request.get("resetTo");
        Integer left = resetTo != null ? resetTo.get("leftVotes") : 0;
        Integer right = resetTo != null ? resetTo.get("rightVotes") : 0;
        Boolean saveBackup = (Boolean) request.getOrDefault("saveBackup", true);
        Boolean notifyUsers = (Boolean) request.getOrDefault("notifyUsers", false);

        VoteData newVotes = VoteData.builder()
                .leftVotes(left)
                .rightVotes(right)
                .build();
        VoteData updated = mockDataService.updateVoteData(streamId, newVotes);
        log.info("投票已重置: streamId={}, left={}, right={}", streamId, left, right);
        return ApiResponse.success(updated);
    }

    /**
     * 启动AI识别
     * 
     * @param request 启动请求
     * @return 操作结果
     */
    @PostMapping("/v1/admin/ai/start")
    public ApiResponse<Map<String, Object>> startAI(@RequestBody Map<String, Object> request) {
        Map<String, Object> settings = (Map<String, Object>) request.get("settings");
        String streamId = (String) request.get("streamId");
        Boolean notifyUsers = (Boolean) request.getOrDefault("notifyUsers", false);

        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("action", "start");
        result.put("settings", settings);
        result.put("message", "AI识别已启动");
        result.put("notifyUsers", notifyUsers);
        result.put("timestamp", LocalDateTime.now());
        // 广播AI识别状态变化事件
        if (webSocketService != null && streamId != null) {
            webSocketService.broadcastAIStatus("running", streamId);
        }
        return ApiResponse.success(result);
    }

    /**
     * 停止AI识别
     * 
     * @param request 停止请求
     * @return 操作结果
     */
    @PostMapping("/v1/admin/ai/stop")
    public ApiResponse<Map<String, Object>> stopAI(@RequestBody Map<String, Object> request) {
        String streamId = (String) request.get("streamId");
        Boolean saveHistory = (Boolean) request.getOrDefault("saveHistory", true);
        Boolean notifyUsers = (Boolean) request.getOrDefault("notifyUsers", false);

        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("action", "stop");
        result.put("message", "AI识别已停止");
        result.put("saveHistory", saveHistory);
        result.put("notifyUsers", notifyUsers);
        result.put("timestamp", LocalDateTime.now());
        // 广播AI识别状态变化事件
        if (webSocketService != null && streamId != null) {
            webSocketService.broadcastAIStatus("stopped", streamId);
        }
        return ApiResponse.success(result);
    }

    /**
     * 暂停/恢复AI识别
     * 
     * @param request 控制请求
     * @return 操作结果
     */
    @PostMapping("/v1/admin/ai/toggle")
    public ApiResponse<Map<String, Object>> toggleAI(@RequestBody Map<String, Object> request) {
        String action = (String) request.get("action");
        Boolean notifyUsers = (Boolean) request.getOrDefault("notifyUsers", false);

        Map<String, Object> result = new HashMap<>();
        result.put("action", action);
        result.put("message", "AI识别已" + ("pause".equals(action) ? "暂停" : "恢复"));
        result.put("notifyUsers", notifyUsers);
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     * 设置直播计划
     * POST /api/admin/live/schedule
     * 
     * @param request 计划请求（包含scheduledStartTime, scheduledEndTime, streamId）
     * @return 设置结果
     */
    @PostMapping("/admin/live/schedule")
    public ApiResponse<Map<String, Object>> setLiveSchedule(@RequestBody Map<String, Object> request) {
        String scheduledStartTime = (String) request.get("scheduledStartTime");
        String scheduledEndTime = (String) request.get("scheduledEndTime");
        String streamId = (String) request.get("streamId");


        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("scheduledStartTime", scheduledStartTime);
        result.put("scheduledEndTime", scheduledEndTime);
        result.put("message", "直播计划已设置");
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     * 获取直播计划
     * GET /api/admin/live/schedule
     * 
     * @return 直播计划数据
     */
    @GetMapping("/admin/live/schedule")
    public ApiResponse<Map<String, Object>> getLiveSchedule() {
        Map<String, Object> schedule = new HashMap<>();
        schedule.put("hasScheduled", true);
        schedule.put("scheduledStartTime", LocalDateTime.now().plusHours(2).toString());
        schedule.put("scheduledEndTime", LocalDateTime.now().plusHours(4).toString());
        schedule.put("streamId", "stream-001");
        schedule.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(schedule);
    }

    /**
     * 取消直播计划
     * POST /api/admin/live/schedule/cancel
     * 
     * @return 取消结果
     */
    @PostMapping("/admin/live/schedule/cancel")
    public ApiResponse<Map<String, Object>> cancelLiveSchedule() {
        Map<String, Object> result = new HashMap<>();
        result.put("cancelled", true);
        result.put("message", "直播计划已取消");
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     * 一次性设置并开始直播
     * POST /api/admin/live/setup-and-start
     * 
     * @param request 设置请求
     * @return 操作结果
     */
    @PostMapping("/admin/live/setup-and-start")
    public ApiResponse<Map<String, Object>> setupAndStartLive(@RequestBody Map<String, Object> request) {
        String streamId = (String) request.get("streamId");
        Boolean startNow = (Boolean) request.getOrDefault("startNow", false);
        String scheduledStartTime = (String) request.get("scheduledStartTime");
        String scheduledEndTime = (String) request.get("scheduledEndTime");


        Map<String, Object> result = new HashMap<>();
        result.put("streamId", streamId);
        result.put("startNow", startNow);
        result.put("scheduledStartTime", scheduledStartTime);
        result.put("scheduledEndTime", scheduledEndTime);
        result.put("message", startNow ? "直播已立即开始" : "直播计划已设置");
        result.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(result);
    }
}