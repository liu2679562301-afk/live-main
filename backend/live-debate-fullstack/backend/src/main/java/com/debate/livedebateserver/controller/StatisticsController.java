package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.model.VoteData;
import com.debate.livedebateserver.service.MockDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据统计控制器
 * 提供投票统计、数据概览等统计相关接口
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StatisticsController {

    @Autowired
    private MockDataService mockDataService;

    /**
     * 获取投票统计数据（v1版本）
     * GET /api/v1/admin/votes/statistics
     *
     * @param stream_id 直播流ID（可选）
     * @return 投票统计数据
     */
    @GetMapping("/v1/admin/votes/statistics")
    public ApiResponse<Map<String, Object>> getVotesStatisticsV1(@RequestParam(required = false) String stream_id) {
        VoteData voteData = mockDataService.getVoteData(stream_id);
        Map<String, Object> stats = new HashMap<>();
        stats.put("streamId", stream_id != null ? stream_id : "all");
        stats.put("leftVotes", voteData.getLeftVotes());
        stats.put("rightVotes", voteData.getRightVotes());
        stats.put("totalVotes", voteData.getTotalVotes());
        stats.put("leftPercentage", voteData.getLeftPercentage());
        stats.put("rightPercentage", voteData.getRightPercentage());
        stats.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(stats);
    }

    /**
     * 获取投票统计数据（旧版接口）
     * GET /api/admin/votes/statistics
     *
     * @param timeRange 时间范围：1h,6h,12h,24h,7d（可选）
     * @return 投票统计数据
     */
    @GetMapping("/admin/votes/statistics")
    public ApiResponse<Map<String, Object>> getVotesStatistics(@RequestParam(required = false) String timeRange) {
        // 模拟不同时间范围的统计数据
        Map<String, Object> stats = new HashMap<>();
        stats.put("timeRange", timeRange != null ? timeRange : "24h");
        stats.put("leftVotes", 12345);
        stats.put("rightVotes", 9876);
        stats.put("totalVotes", 22221);
        stats.put("leftPercentage", 56);
        stats.put("rightPercentage", 44);
        stats.put("peakTime", "2026-04-03 20:30:00");
        stats.put("timestamp", LocalDateTime.now());
        return ApiResponse.success(stats);
    }

    /**
     * 获取统计摘要
     * GET /api/admin/statistics/summary
     *
     * @return 统计摘要数据
     */
    @GetMapping("/admin/statistics/summary")
    public ApiResponse<Map<String, Object>> getStatisticsSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("timestamp", LocalDateTime.now());
        
        // 直播数据
        summary.put("totalStreams", 5);
        summary.put("activeStreams", 2);
        summary.put("totalViewers", 1234);
        
        // 投票数据
        summary.put("totalVotes", 22221);
        summary.put("leftVotes", 12345);
        summary.put("rightVotes", 9876);
        
        // AI内容数据
        summary.put("aiContentCount", 42);
        summary.put("aiCommentsCount", 156);
        
        // 用户数据
        summary.put("totalUsers", 789);
        summary.put("activeUsers", 234);
        
        return ApiResponse.success(summary);
    }

    /**
     * 获取每日统计
     * GET /api/admin/statistics/daily
     *
     * @return 每日统计数据
     */
    @GetMapping("/admin/statistics/daily")
    public ApiResponse<Map<String, Object>> getDailyStatistics() {
        Map<String, Object> daily = new HashMap<>();
        daily.put("date", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE));
        
        // 模拟7天数据
        Map<String, Map<String, Integer>> dailyData = new HashMap<>();
        String[] dates = {"2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06", "2026-04-07"};
        for (String date : dates) {
            Map<String, Integer> dayStats = new HashMap<>();
            dayStats.put("viewers", 1000 + (int)(Math.random() * 1000));
            dayStats.put("votes", 5000 + (int)(Math.random() * 5000));
            dayStats.put("comments", 50 + (int)(Math.random() * 50));
            dailyData.put(date, dayStats);
        }
        daily.put("dailyData", dailyData);
        daily.put("timestamp", LocalDateTime.now());
        
        return ApiResponse.success(daily);
    }
}