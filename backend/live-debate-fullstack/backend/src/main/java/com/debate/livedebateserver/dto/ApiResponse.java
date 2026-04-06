package com.debate.livedebateserver.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一API响应格式
 * 所有RESTful API接口都返回此格式的JSON数据，确保前端处理的一致性。
 * 
 * 响应格式：
 * {
 *   "code": 0,           // 状态码（0=成功，其他=错误）
 *   "message": "success", // 消息描述
 *   "data": { ... },     // 业务数据（任意类型）
 *   "timestamp": 1234567890123 // 时间戳（毫秒）
 * }
 * 
 * 使用说明：
 * 成功响应：code=0, message="success", data=业务数据
 * 错误响应：code>0, message=错误描述, data=null
 * 
 * @param <T> 业务数据类型
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    
    /** 状态码（0=成功，其他=错误） */
    private Integer code;
    
    /** 消息描述 */
    private String message;
    
    /** 业务数据（任意类型） */
    private T data;
    
    /** 响应时间戳（毫秒） */
    private Long timestamp;

    /**
     * 快速创建成功响应
     * 
     * @param data 业务数据
     * @param <T> 数据类型
     * @return ApiResponse对象
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .code(0)
                .message("success")
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 创建带自定义消息的成功响应
     * 
     * @param message 自定义消息
     * @param data 业务数据
     * @param <T> 数据类型
     * @return ApiResponse对象
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .code(0)
                .message(message)
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 创建错误响应
     * 
     * @param message 错误消息
     * @param <T> 数据类型
     * @return ApiResponse对象（data=null）
     */
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .code(1)
                .message(message)
                .data(null)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 创建带自定义错误码的错误响应
     * 
     * @param code 错误码
     * @param message 错误消息
     * @param <T> 数据类型
     * @return ApiResponse对象（data=null）
     */
    public static <T> ApiResponse<T> error(Integer code, String message) {
        return ApiResponse.<T>builder()
                .code(code)
                .message(message)
                .data(null)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 是否成功（基于code判断，code=0时为true）
     * 添加@JsonProperty注解确保序列化为JSON字段
     * @return 是否成功
     */
    @JsonProperty("success")
    public Boolean getSuccess() {
        return code == 0;
    }
}
