package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 录播实体类
 * 存储录播文件的基本信息，包括Minio对象键、元数据和播放地址
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-04
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recording {
    /** 录播唯一标识 */
    private String id;
    
    /** 录播文件在Minio中的对象键（路径） */
    private String objectKey;
    
    /** 原始文件名 */
    private String filename;
    
    /** 录播标题 */
    private String title;
    
    /** 描述信息 */
    private String description;
    
    /** 视频时长（秒） */
    private Integer duration;
    
    /** 文件大小（字节） */
    private Long size;
    
    /** 视频宽度（像素） */
    private Integer width;
    
    /** 视频高度（像素） */
    private Integer height;
    
    /** 视频格式（mp4, flv, m3u8等） */
    private String format;
    
    /** 存储Bucket名称 */
    private String bucket;
    
    /** 是否启用 */
    private Boolean enabled;
    
    /** 关联的直播流ID（如果有） */
    private String streamId;
    
    /** 创建时间 */
    private LocalDateTime createdAt;
    
    /** 最后更新时间 */
    private LocalDateTime updatedAt;
    
    /** 播放URL（预签名URL，临时生成，不持久化） */
    @Builder.Default
    private transient String playUrl = "";
}