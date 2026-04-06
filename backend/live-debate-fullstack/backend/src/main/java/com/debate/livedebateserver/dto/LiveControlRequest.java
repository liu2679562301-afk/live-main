package com.debate.livedebateserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 直播控制请求DTO
 * 用于接收直播启动/停止操作的参数
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveControlRequest {
    /** 操作类型：start（启动）或 stop（停止） */
    private String action;
    
    /** 直播流ID */
    private String streamId;
    
    /** 直播流播放地址 */
    private String streamUrl;
    
    /** 是否自动启动AI内容生成 */
    private Boolean autoStartAI;
    
    /** 是否通知在线用户 */
    private Boolean notifyUsers;
}
