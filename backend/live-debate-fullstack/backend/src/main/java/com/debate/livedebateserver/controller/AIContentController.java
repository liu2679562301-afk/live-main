package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.dto.CommentRequest;
import com.debate.livedebateserver.model.AIContent;
import com.debate.livedebateserver.service.MockDataService;
import com.debate.livedebateserver.service.WebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI内容控制器
 * 提供AI生成辩论内容相关的RESTful API接口，包括：
 * 获取AI内容列表（支持按直播流过滤）
 * 管理端新增AI内容
 * 用户发表评论
 * 用户点赞（支持对内容和评论的点赞）
 * API路径前缀：/api，同时提供旧版和v1版本接口以保证兼容性
 *
 * @author LiveDebate Team
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AIContentController {

    /** AI内容数据服务 */
    @Autowired
    private MockDataService mockDataService;

    /** WebSocket服务，用于广播评论事件 */
    @Autowired
    private WebSocketService webSocketService;

    /**
     * 获取AI内容列表（旧版接口）
     *
     * @param stream_id 直播流ID（可选，为空时返回所有内容）
     * @return AI内容列表
     */
    @GetMapping("/ai-content")
    public ApiResponse<List<AIContent>> getAIContent(@RequestParam(required = false) String stream_id) {
        List<AIContent> contents = mockDataService.getAIContents(stream_id);
        return ApiResponse.success(contents);
    }

    /**
     * 获取AI内容列表（v1版本接口）
     *
     * @param stream_id 直播流ID（可选，为空时返回所有内容）
     * @return AI内容列表
     */
    @GetMapping("/v1/ai-content")
    public ApiResponse<List<AIContent>> getAIContentV1(@RequestParam(required = false) String stream_id) {
        List<AIContent> contents = mockDataService.getAIContents(stream_id);
        return ApiResponse.success(contents);
    }

    /**
     * 获取AI内容列表（管理端旧版接口）
     *
     * @param stream_id 直播流ID（可选，为空时返回所有内容）
     * @return AI内容列表
     */
    @GetMapping("/admin/ai-content/list")
    public ApiResponse<List<AIContent>> getAIContentList(@RequestParam(required = false) String stream_id) {
        List<AIContent> contents = mockDataService.getAIContents(stream_id);
        return ApiResponse.success(contents);
    }

    /**
     * 获取AI内容列表（管理端v1版本接口）
     *
     * @param stream_id 直播流ID（可选，为空时返回所有内容）
     * @return AI内容列表
     */
    @GetMapping("/v1/admin/ai-content/list")
    public ApiResponse<List<AIContent>> getAIContentListV1(@RequestParam(required = false) String stream_id) {
        List<AIContent> contents = mockDataService.getAIContents(stream_id);
        return ApiResponse.success(contents);
    }

    /**
     * 管理端新增AI内容
     * 自动生成ID和时间戳，并初始化评论和统计数据
     *
     * @param content AI内容对象
     * @return 创建成功的AI内容
     */
    @PostMapping("/admin/ai-content")
    public ApiResponse<AIContent> addAIContent(@RequestBody AIContent content) {
        mockDataService.addAIContent(content);
        return ApiResponse.success(content);
    }

    /**
     * 用户发表评论（API文档标准格式）
     * 请求体：{"contentId": "xxx", "text": "评论内容", "user": "用户昵称", "avatar": "头像URL"}
     * 自动生成评论ID和时间戳
     *
     * @param request 评论请求对象
     * @return 创建成功的评论对象；若内容不存在则返回错误信息
     */
    @PostMapping("/comment")
    public ApiResponse<AIContent.Comment> addComment(@RequestBody CommentRequest request) {
        AIContent content = mockDataService.getAIContentById(request.getContentId());
        if (content != null) {
            // 构建评论对象
            AIContent.Comment comment = AIContent.Comment.builder()
                    .id("comment-" + java.util.UUID.randomUUID().toString().substring(0, 8))
                    .userId("user-" + java.util.UUID.randomUUID().toString().substring(0, 6)) // 模拟用户ID
                    .nickname(request.getUser())
                    .avatar(request.getAvatar())
                    .content(request.getText())
                    .likes(0)
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            // 确保评论列表不为空
            if (content.getComments() == null) {
                content.setComments(new ArrayList<>());
            }
            content.getComments().add(comment);
            // 保存数据
            mockDataService.updateAIContent(content.getId(), content);
            // 广播新评论事件
            if (webSocketService != null) {
                long timestamp = comment.getTimestamp().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                webSocketService.broadcastComment(
                    comment.getId(),
                    request.getContentId(),
                    comment.getNickname(),
                    comment.getContent(),
                    comment.getAvatar(),
                    timestamp,
                    content.getStreamId()
                );
            }
            return ApiResponse.success(comment);
        }
        return ApiResponse.error("Content not found");
    }

    /**
     * 删除评论（API文档标准格式）
     * 请求体需包含contentId（AI内容ID）
     *
     * @param commentId 评论ID（路径参数）
     * @param request 请求体（包含contentId）
     * @return 删除成功响应
     */
    @DeleteMapping("/comment/{commentId}")
    public ApiResponse<Void> deleteComment(@PathVariable String commentId, @RequestBody Map<String, String> request) {
        String contentId = request.get("contentId");
        if (contentId == null) {
            return ApiResponse.error("contentId is required in request body");
        }
        boolean deleted = mockDataService.deleteComment(contentId, commentId);
        if (deleted) {
            return ApiResponse.success(null);
        }
        return ApiResponse.error("Comment not found");
    }

    /**
     * 用户点赞
     * 支持两种点赞模式：
     * 1. 对AI内容点赞：仅传入contentId，commentId为空
     * 2. 对评论点赞：同时传入contentId和commentId
     *
     * @param contentId AI内容ID
     * @param commentId 评论ID（可选，传入时对评论点赞）
     * @return 点赞后的内容总赞数；若内容不存在则返回错误信息
     */
    @PostMapping("/like")
    public ApiResponse<Integer> like(@RequestParam String contentId, @RequestParam(required = false) String commentId) {
        AIContent content = mockDataService.getAIContentById(contentId);
        if (content != null) {
            if (commentId != null) {
                // 对指定评论点赞
                content.getComments().stream()
                        .filter(c -> c.getId().equals(commentId))
                        .findFirst()
                        .ifPresent(comment -> comment.setLikes(comment.getLikes() + 1));
            } else {
                // 对AI内容本身点赞
                content.setLikes(content.getLikes() + 1);
            }
            // 保存更新后的数据
            mockDataService.updateAIContent(content.getId(), content);
            return ApiResponse.success(content.getLikes());
        }
        return ApiResponse.error("Content not found");
    }

    /**
     * 获取AI内容的评论列表（v1管理端接口）
     * 
     * @param contentId AI内容ID（路径参数）
     * @param page 页码（可选，默认1）
     * @param pageSize 每页大小（可选，默认10）
     * @return 评论列表
     */
    @GetMapping("/v1/admin/ai-content/{contentId}/comments")
    public ApiResponse<List<AIContent.Comment>> getAIContentComments(
            @PathVariable String contentId,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "10") Integer pageSize) {
        List<AIContent.Comment> comments = mockDataService.getAIContentComments(contentId);
        // 简单分页逻辑
        int start = (page - 1) * pageSize;
        int end = Math.min(start + pageSize, comments.size());
        if (start >= comments.size()) {
            return ApiResponse.success(new ArrayList<>());
        }
        List<AIContent.Comment> pagedComments = comments.subList(start, end);
        return ApiResponse.success(pagedComments);
    }

    /**
     * 删除AI内容的评论（v1管理端接口）
     * 
     * @param contentId AI内容ID（路径参数）
     * @param commentId 评论ID（路径参数）
     * @return 删除成功响应
     */
    @DeleteMapping("/v1/admin/ai-content/{contentId}/comments/{commentId}")
    public ApiResponse<Void> deleteAIContentComment(
            @PathVariable String contentId,
            @PathVariable String commentId) {
        boolean deleted = mockDataService.deleteComment(contentId, commentId);
        if (deleted) {
            return ApiResponse.success(null);
        }
        return ApiResponse.error("Comment not found");
    }

    /**
     * 更新AI内容（管理端接口）
     * 
     * @param id AI内容ID（路径参数）
     * @param content 新的AI内容数据
     * @return 更新后的AI内容
     */
    @PutMapping("/admin/ai-content/{id}")
    public ApiResponse<AIContent> updateAIContent(
            @PathVariable String id,
            @RequestBody AIContent content) {
        AIContent updated = mockDataService.updateAIContent(id, content);
        if (updated != null) {
            return ApiResponse.success(updated);
        }
        return ApiResponse.error("AI content not found");
    }

    /**
     * 删除AI内容（管理端接口）
     * 
     * @param id AI内容ID（路径参数）
     * @return 删除成功响应
     */
    @DeleteMapping("/admin/ai-content/{id}")
    public ApiResponse<Void> deleteAIContent(@PathVariable String id) {
        boolean deleted = mockDataService.deleteAIContent(id);
        if (deleted) {
            return ApiResponse.success(null);
        }
        return ApiResponse.error("AI content not found");
    }
}
