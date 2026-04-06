package com.debate.livedebateserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评论请求DTO
 * 用于接收用户发表评论的请求参数
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    /** AI内容ID */
    private String contentId;
    
    /** 评论内容 */
    private String text;
    
    /** 用户昵称 */
    private String user;
    
    /** 用户头像URL */
    private String avatar;
}