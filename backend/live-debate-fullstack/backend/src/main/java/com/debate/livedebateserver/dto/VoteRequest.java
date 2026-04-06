package com.debate.livedebateserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 投票请求DTO
 * 支持两种投票模式：100票分配制（leftVotes + rightVotes = 100）和增量投票（指定side和票数）
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoteRequest {
    /** 正方票数（100票分配制） */
    private Integer leftVotes;
    
    /** 反方票数（100票分配制） */
    private Integer rightVotes;
    
    /** 直播流ID */
    private String streamId;
    
    /** 用户ID（用于记录投票用户） */
    private String userId;
    
    /** 投票方：left（正方）或 right（反方） */
    private String side;
    
    /** 票数（增量投票） */
    private Integer votes;
}
