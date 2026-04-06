package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SRS回调控制器（占位符）
 * 用于接收SRS服务器的HTTP回调，例如录制完成事件（on_dvr）
 * 目前仅记录日志，后续可根据业务需求扩展：
 * 1. 接收录制文件路径，上传到Minio
 * 2. 创建录播元数据
 * 3. 通知前端有新录播可用
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-04
 */
@Slf4j
@RestController
@RequestMapping("/api/srs")
@CrossOrigin(origins = "*")
public class SrsCallbackController {

    /**
     * SRS录制完成回调接口
     * SRS配置示例（srs.conf）：
     * http_hooks {
     *     enabled on;
     *     on_dvr http://localhost:8081/api/srs/callback/dvr;
     * }
     * 回调数据格式参考SRS文档：https://ossrs.net/lts/zh-cn/docs/v4/doc/http-callback
     *
     * @param payload SRS回调的JSON数据
     * @return 处理结果
     */
    @PostMapping("/callback/dvr")
    public ApiResponse<Map<String, Object>> onDvr(@RequestBody Map<String, Object> payload) {
        log.info("收到SRS录制完成回调: {}", payload);
        // TODO: 解析payload，获取录制文件路径等信息
        // 示例payload结构：
        // {
        //   "action": "on_dvr",
        //   "client_id": "123",
        //   "ip": "192.168.1.100",
        //   "vhost": "__defaultVhost__",
        //   "app": "live",
        //   "stream": "stream1",
        //   "param": "",
        //   "cwd": "/usr/local/srs",
        //   "file": "./objs/nginx/html/live/stream1/stream1.20231201.mp4"
        // }
        // 后续扩展：
        // 1. 调用MinioService上传文件到Minio
        // 2. 调用MockDataService创建录播元数据
        // 3. 通过WebSocket通知前端有新录播
        return ApiResponse.success(payload);
    }

    /**
     * SRS流发布开始回调（占位符）
     */
    @PostMapping("/callback/publish")
    public ApiResponse<Map<String, Object>> onPublish(@RequestBody Map<String, Object> payload) {
        log.info("收到SRS流发布回调: {}", payload);
        return ApiResponse.success(payload);
    }

    /**
     * SRS流停止回调（占位符）
     */
    @PostMapping("/callback/unpublish")
    public ApiResponse<Map<String, Object>> onUnpublish(@RequestBody Map<String, Object> payload) {
        log.info("收到SRS流停止回调: {}", payload);
        return ApiResponse.success(payload);
    }

    /**
     * SRS播放开始回调（占位符）
     */
    @PostMapping("/callback/play")
    public ApiResponse<Map<String, Object>> onPlay(@RequestBody Map<String, Object> payload) {
        log.info("收到SRS播放回调: {}", payload);
        return ApiResponse.success(payload);
    }

    /**
     * SRS播放停止回调（占位符）
     */
    @PostMapping("/callback/stop")
    public ApiResponse<Map<String, Object>> onStop(@RequestBody Map<String, Object> payload) {
        log.info("收到SRS播放停止回调: {}", payload);
        return ApiResponse.success(payload);
    }
}