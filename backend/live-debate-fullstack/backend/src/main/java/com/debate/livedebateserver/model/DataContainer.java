package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 数据容器类
 * 用于JSON序列化和反序列化，持久化所有内存数据到本地文件
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataContainer {
    
    /** 直播流列表 */
    private List<LiveStream> streams;
    
    /** 投票数据映射表：streamId -> VoteData */
    private Map<String, VoteData> votes;
    
    /** AI内容列表 */
    private List<AIContent> aiContents;
    
    /** 直播状态映射表：streamId -> status */
    private Map<String, Boolean> liveStatus;
    
    /** 辩题信息 */
    private DebateTopic debateTopic;
    
    /** 录播列表 */
    private List<Recording> recordings;
}