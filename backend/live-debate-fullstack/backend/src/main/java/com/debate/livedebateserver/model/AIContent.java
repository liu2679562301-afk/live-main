package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI内容实体类
 * 存储AI生成的辩论观点，包含内容、立场、评论、点赞和统计数据
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIContent {
    /** 内容唯一标识 */
    private String id;
    
    /** 关联的辩题ID */
    private String debateId;
    
    /** 观点文本内容 */
    private String text;
    
    /** 立场：left（正方）或 right（反方） */
    private String side;
    
    /** 发布时间戳 */
    private LocalDateTime timestamp;
    
    /** 评论列表 */
    private List<Comment> comments;
    
    /** 点赞数 */
    private Integer likes;
    
    /** 统计数据（浏览量、点赞数、评论数） */
    private Statistics statistics;
    
    /** 关联的直播流ID */
    private String streamId;

    /**
     * 评论实体类
     * 用户对AI内容的回复
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Comment {
        /** 评论唯一标识 */
        private String id;
        
        /** 用户ID */
        private String userId;
        
        /** 用户昵称 */
        private String nickname;
        
        /** 用户头像URL */
        private String avatar;
        
        /** 评论内容 */
        private String content;
        
        /** 评论点赞数 */
        private Integer likes;
        
        /** 评论时间戳 */
        private LocalDateTime timestamp;
    }

    /**
     * 统计数据实体类
     * 记录AI内容的交互数据
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Statistics {
        /** 浏览次数 */
        private Integer views;
        
        /** 点赞次数 */
        private Integer likes;
        
        /** 评论数量 */
        private Integer comments;
    }
}
