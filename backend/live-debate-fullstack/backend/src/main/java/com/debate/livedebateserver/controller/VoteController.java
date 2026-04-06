package com.debate.livedebateserver.controller;

import com.debate.livedebateserver.dto.ApiResponse;
import com.debate.livedebateserver.dto.VoteRequest;
import com.debate.livedebateserver.model.VoteData;
import com.debate.livedebateserver.service.MockDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * 投票控制器
 * 提供投票相关的RESTful API接口，包括：
 * 获取投票数据
 * 用户投票（支持100票分配制和增量投票）
 * 管理端更新投票
 * 所有接口支持CORS跨域访问
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class VoteController {

    /** 注入Mock数据服务 */
    @Autowired
    private MockDataService mockDataService;

    /**
     * 获取投票数据（兼容旧版本）
     * 
     * @param stream_id 直播流ID（可选）
     * @return 投票数据响应
     */
    @GetMapping("/votes")
    public ApiResponse<VoteData> getVotes(@RequestParam(required = false) String stream_id) {
        // 从服务层获取投票数据
        VoteData voteData = mockDataService.getVoteData(stream_id);
        return ApiResponse.success(voteData);
    }

    /**
     * 获取投票数据（v1版本）
     * 
     * @param stream_id 直播流ID（可选）
     * @return 投票数据响应
     */
    @GetMapping("/v1/votes")
    public ApiResponse<VoteData> getVotesV1(@RequestParam(required = false) String stream_id) {
        // 从服务层获取投票数据
        VoteData voteData = mockDataService.getVoteData(stream_id);
        return ApiResponse.success(voteData);
    }

    /**
     * 用户投票（兼容旧版本）
     * 支持两种投票模式：
     * 1. 100票分配制：leftVotes + rightVotes = 100
     * 2. 增量投票：指定side（left/right）和票数
     *
     * @param request 投票请求对象
     * @return 更新后的投票数据
     */
    @PostMapping("/user-vote")
    public ApiResponse<VoteData> userVote(@RequestBody VoteRequest request) {
        // 委托给内部处理方法
        return processVote(request);
    }

    /**
     * 用户投票（v1版本）
     * 支持两种投票模式：
     * 1. 100票分配制：leftVotes + rightVotes = 100
     * 2. 增量投票：指定side（left/right）和票数
     *
     * @param request 投票请求对象
     * @return 更新后的投票数据
     */
    @PostMapping("/v1/user-vote")
    public ApiResponse<VoteData> userVoteV1(@RequestBody VoteRequest request) {
        // 委托给内部处理方法
        return processVote(request);
    }

    /**
     * 内部投票处理方法
     * 根据请求参数判断投票模式：
     * 如果提供leftVotes和rightVotes：使用100票分配制
     * 如果提供side和votes：使用增量投票
     *
     * @param request 投票请求对象
     * @return 处理结果
     */
    private ApiResponse<VoteData> processVote(VoteRequest request) {
        VoteData voteData;
        // 判断投票模式
        if (request.getLeftVotes() != null && request.getRightVotes() != null) {
            // 100票分配制
            voteData = VoteData.builder()
                    .leftVotes(request.getLeftVotes())
                    .rightVotes(request.getRightVotes())
                    .build();
            // 更新到服务层
            voteData = mockDataService.updateVoteData(request.getStreamId(), voteData);
        } else if (request.getSide() != null && request.getVotes() != null) {
            // 增量投票
            mockDataService.addVote(request.getStreamId(), request.getSide(), request.getVotes());
            // 获取更新后的数据
            voteData = mockDataService.getVoteData(request.getStreamId());
        } else {
            // 参数错误
            return ApiResponse.error("Invalid vote request");
        }
        
        return ApiResponse.success(voteData);
    }

    /**
     * 管理端更新投票数据
     * 允许管理员直接设置投票数值
     *
     * @param request 投票请求对象（包含leftVotes和rightVotes）
     * @return 更新后的投票数据
     */
    @PostMapping("/v1/admin/live/update-votes")
    public ApiResponse<VoteData> updateVotes(@RequestBody VoteRequest request) {
        // 构建VoteData对象
        VoteData voteData = VoteData.builder()
                .leftVotes(request.getLeftVotes() != null ? request.getLeftVotes() : 0)
                .rightVotes(request.getRightVotes() != null ? request.getRightVotes() : 0)
                .build();
        
        // 更新到服务层
        voteData = mockDataService.updateVoteData(request.getStreamId(), voteData);
        return ApiResponse.success(voteData);
    }

    /**
     * 查询用户的投票状态（v1版本）
     * 
     * @param stream_id 直播流ID（必需）
     * @param user_id 用户ID（必需）
     * @return 用户的投票状态
     */
    @GetMapping("/v1/user-votes")
    public ApiResponse<Map<String, Object>> getUserVotes(
            @RequestParam String stream_id,
            @RequestParam String user_id) {
        // 模拟返回用户投票状态
        Map<String, Object> result = new HashMap<>();
        result.put("streamId", stream_id);
        result.put("userId", user_id);
        result.put("hasVoted", true);
        result.put("voteSide", "left");
        result.put("voteCount", 60);
        result.put("timestamp", System.currentTimeMillis());
        return ApiResponse.success(result);
    }
}
