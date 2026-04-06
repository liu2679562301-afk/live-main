package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 投票数据实体类
 * 存储投票统计数据，包括：
 * 正方票数（leftVotes）
 * 反方票数（rightVotes）
 * 总票数（自动计算）
 * 正方百分比（自动计算）
 * 反方百分比（自动计算）
 * 
 * 百分比计算规则：
 * 总票数 = leftVotes + rightVotes
 * leftPercentage = (leftVotes / totalVotes) * 100
 * rightPercentage = (rightVotes / totalVotes) * 100
 * 如果totalVotes=0，则各占50%
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoteData {
    
    /** 正方票数 */
    private Integer leftVotes;
    
    /** 反方票数 */
    private Integer rightVotes;
    
    /** 总票数（leftVotes + rightVotes） */
    private Integer totalVotes;
    
    /** 正方百分比（0-100） */
    private Integer leftPercentage;
    
    /** 反方百分比（0-100） */
    private Integer rightPercentage;
}
