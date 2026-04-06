package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 直播流实体类
 * 存储直播流的基本信息，包括地址、类型、状态和时间戳
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveStream {
    /** 直播流唯一标识 */
    private String id;
    
    /** 直播流名称 */
    private String name;
    
    /** 播放地址 */
    private String url;
    
    /** 流媒体协议类型：hls, rtmp, flv */
    private String type;
    
    /** 描述信息 */
    private String description;
    
    /** 是否启用 */
    private Boolean enabled;
    
    /** 流地址（冗余字段，通常与url相同） */
    private String streamUrl;
    
    /** 创建时间 */
    private LocalDateTime createdAt;
    
    /** 最后更新时间 */
    private LocalDateTime updatedAt;
}
