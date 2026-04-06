package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 用户管理控制器
 * 提供用户登录、用户列表等管理接口
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class UserController {

    /**
     * 微信登录接口
     * POST /api/wechat-login
     *
     * @param request 登录请求（包含code, userInfo, encryptedData, iv等）
     * @return 登录结果（包含session token, 用户信息等）
     */
    @PostMapping("/wechat-login")
    public ApiResponse<Map<String, Object>> wechatLogin(@RequestBody Map<String, Object> request) {
        String code = (String) request.get("code");
        Map<String, Object> userInfo = (Map<String, Object>) request.get("userInfo");
        
        // 模拟登录成功
        Map<String, Object> result = new HashMap<>();
        result.put("code", code);
        result.put("userInfo", userInfo);
        result.put("token", "mock-jwt-token-" + UUID.randomUUID().toString().substring(0, 8));
        result.put("expiresIn", 7200);
        result.put("openid", "mock-openid-" + UUID.randomUUID().toString().substring(0, 10));
        result.put("sessionKey", "mock-session-key");
        result.put("timestamp", LocalDateTime.now());
        
        return ApiResponse.success(result);
    }

    /**
     * 获取用户列表（分页，小程序用户）
     * GET /api/admin/miniprogram/users
     *
     * @param page 页码（可选，默认1）
     * @param pageSize 每页大小（可选，默认20）
     * @param nickname 昵称过滤（可选）
     * @param startDate 注册开始日期（可选）
     * @param endDate 注册结束日期（可选）
     * @return 用户列表
     */
    @GetMapping("/admin/miniprogram/users")
    public ApiResponse<Map<String, Object>> getMiniProgramUsers(
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer pageSize,
            @RequestParam(required = false) String nickname,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        // 模拟用户数据
        List<Map<String, Object>> users = new ArrayList<>();
        int totalUsers = 156;
        for (int i = 0; i < Math.min(pageSize, 10); i++) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", "user-" + (page * pageSize + i));
            user.put("openid", "openid-" + UUID.randomUUID().toString().substring(0, 8));
            user.put("nickname", "用户" + (page * pageSize + i));
            user.put("avatar", "https://randomuser.me/api/portraits/men/" + i + ".jpg");
            user.put("gender", i % 3); // 0未知，1男，2女
            user.put("city", "城市" + i);
            user.put("country", "中国");
            user.put("province", "省份" + i);
            user.put("registerTime", LocalDateTime.now().minusDays(i).toString());
            user.put("lastLoginTime", LocalDateTime.now().minusHours(i).toString());
            user.put("voteCount", 10 + i);
            users.add(user);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("total", totalUsers);
        result.put("totalPages", (int) Math.ceil((double) totalUsers / pageSize));
        result.put("users", users);
        result.put("timestamp", LocalDateTime.now());
        
        return ApiResponse.success(result);
    }

    /**
     * 获取所有用户列表（旧版接口）
     * GET /api/admin/users
     *
     * @return 所有用户列表
     */
    @GetMapping("/admin/users")
    public ApiResponse<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", "user-" + i);
            user.put("username", "user" + i);
            user.put("nickname", "测试用户" + i);
            user.put("email", "user" + i + "@example.com");
            user.put("role", i % 3 == 0 ? "admin" : "user");
            user.put("createdAt", LocalDateTime.now().minusDays(i).toString());
            users.add(user);
        }
        return ApiResponse.success(users);
    }

    /**
     * 获取指定用户详情
     * GET /api/admin/users/{id}
     *
     * @param id 用户ID
     * @return 用户详情
     */
    @GetMapping("/admin/users/{id}")
    public ApiResponse<Map<String, Object>> getUserById(@PathVariable String id) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", id);
        user.put("username", "user-" + id);
        user.put("nickname", "用户" + id);
        user.put("avatar", "https://randomuser.me/api/portraits/men/1.jpg");
        user.put("email", id + "@example.com");
        user.put("phone", "13800138000");
        user.put("role", "user");
        user.put("createdAt", LocalDateTime.now().minusDays(10).toString());
        user.put("lastLogin", LocalDateTime.now().minusHours(2).toString());
        user.put("voteHistory", Arrays.asList(
                Map.of("streamId", "stream-001", "side", "left", "votes", 60, "time", LocalDateTime.now().minusHours(5)),
                Map.of("streamId", "stream-001", "side", "right", "votes", 40, "time", LocalDateTime.now().minusHours(3))
        ));
        
        return ApiResponse.success(user);
    }
}