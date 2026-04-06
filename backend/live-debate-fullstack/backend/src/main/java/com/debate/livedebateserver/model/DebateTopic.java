package com.debate.livedebateserver.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 辩题实体类
 * 存储辩论主题的基本信息，包括：
 * 辩题ID（唯一标识）
 * 辩题标题
 * 辩题描述
 * 正方立场
 * 反方立场
 * 
 * 使用Lombok注解简化开发：
 * @Data: 自动生成getter、setter、toString、equals、hashCode
 * @Builder: 提供构建者模式创建对象
 * @NoArgsConstructor: 无参构造函数
 * @AllArgsConstructor: 全参构造函数
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebateTopic {
    
    /** 辩题唯一标识（UUID格式） */
    private String id;
    
    /** 辩题标题（显示在页面顶部） */
    private String title;
    
    /** 辩题详细描述（可选） */
    private String description;
    
    /** 正方立场描述（例如："会按"） */
    private String leftPosition;
    
    /** 反方立场描述（例如："不会按"） */
    private String rightPosition;
}
