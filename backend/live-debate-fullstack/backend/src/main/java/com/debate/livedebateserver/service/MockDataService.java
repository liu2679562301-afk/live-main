package com.debate.livedebateserver.service;

import com.debate.livedebateserver.model.*;
import com.github.javafaker.Faker;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Mock数据服务类
 * 本类提供基于内存的Mock数据管理，支持JSON文件持久化。
 * 使用JavaFaker生成模拟数据，支持直播流、投票、AI内容、辩题等核心功能。
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Slf4j
@Service
public class MockDataService {
    
    /**
     * JavaFaker实例，用于生成模拟数据
     * 使用固定种子(12345)确保每次启动数据一致
     */
    private final Faker faker = new Faker(new Random(12345));
    
    /** JSON存储服务 */
    @Autowired
    private JsonStorageService jsonStorageService;

    /** WebSocket服务，用于广播实时事件 */
    @Autowired
    private WebSocketService webSocketService;
    
    /** 是否启用持久化 */
    @Value("${app.storage.enabled:true}")
    private boolean storageEnabled;
    
    /** 直播流数据存储（非线程安全，适用于读多写少场景） */
    private final List<LiveStream> streams = new ArrayList<>();
    
    /** 投票数据存储（线程安全，支持并发访问） */
    private final Map<String, VoteData> votes = new ConcurrentHashMap<>();
    
    /** AI内容数据存储 */
    private final List<AIContent> aiContents = new ArrayList<>();
    
    /** 直播状态存储（线程安全） */
    private final Map<String, Boolean> liveStatus = new ConcurrentHashMap<>();
    
    /** 辩题信息 */
    private DebateTopic debateTopic;
    
    /** 录播数据存储 */
    private final List<Recording> recordings = new ArrayList<>();
    
    /**
     * 初始化方法，由Spring在Bean创建后自动调用
     * 使用@PostConstruct注解确保在服务可用前完成数据初始化
     */
    @PostConstruct
    public void init() {
        // 尝试从JSON文件加载数据
        if (storageEnabled && jsonStorageService.dataFileExists()) {
            DataContainer container = jsonStorageService.loadData();
            if (container != null) {
                loadFromContainer(container);
                log.info("从JSON文件加载数据成功，包含{}个直播流，{}个AI内容，{}个投票项",
                        streams.size(), aiContents.size(), votes.size());
                return;
            }
        }
        
        // 文件不存在或加载失败，初始化模拟数据
        initializeMockData();
        log.info("初始化模拟数据完成，包含{}个直播流，{}个AI内容，{}个投票项",
                streams.size(), aiContents.size(), votes.size());
        
        // 保存初始数据到文件
        if (storageEnabled) {
            saveData();
        }
    }
    
    /**
     * 从数据容器加载数据到内存
     */
    private void loadFromContainer(DataContainer container) {
        if (container.getStreams() != null) {
            streams.clear();
            streams.addAll(container.getStreams());
        }
        if (container.getVotes() != null) {
            votes.clear();
            votes.putAll(container.getVotes());
        }
        if (container.getAiContents() != null) {
            aiContents.clear();
            aiContents.addAll(container.getAiContents());
        }
        if (container.getLiveStatus() != null) {
            liveStatus.clear();
            liveStatus.putAll(container.getLiveStatus());
        }
        if (container.getDebateTopic() != null) {
            debateTopic = container.getDebateTopic();
        }
        if (container.getRecordings() != null) {
            recordings.clear();
            recordings.addAll(container.getRecordings());
        }
    }
    
    /**
     * 构建当前数据容器
     */
    private DataContainer buildContainer() {
        return DataContainer.builder()
                .streams(new ArrayList<>(streams))
                .votes(new ConcurrentHashMap<>(votes))
                .aiContents(new ArrayList<>(aiContents))
                .liveStatus(new ConcurrentHashMap<>(liveStatus))
                .debateTopic(debateTopic)
                .recordings(new ArrayList<>(recordings))
                .build();
    }
    
    /**
     * 保存数据到JSON文件
     */
    private void saveData() {
        if (!storageEnabled) {
            return;
        }
        DataContainer container = buildContainer();
        boolean success = jsonStorageService.saveData(container);
        if (!success) {
            log.warn("保存数据到JSON文件失败");
        }
    }
    
    /**
     * 初始化所有Mock数据
     * 按顺序初始化：
     * 1. 辩题信息
     * 2. 直播流数据
     * 3. 投票数据（默认0票）
     * 4. AI内容（含评论）
     * 5. 直播状态（默认离线）
     * 6. 录播数据（模拟录播文件）
     */
    private void initializeMockData() {
        // 1. 初始化辩题
        debateTopic = DebateTopic.builder()
                .id("debate-001")
                .title("如果有一个能一键消除痛苦的按钮，你会按吗？")
                .description("这是一个关于痛苦、成长与人性选择的深度辩论")
                .leftPosition("会按")
                .rightPosition("不会按")
                .build();
        
        // 2. 初始化直播流
        streams.addAll(Arrays.asList(
            LiveStream.builder()
                .id("stream-001")
                .name("主直播间")
                .url("http://192.168.31.189:8086/live/stream1.m3u8")
                .type("hls")
                .description("主辩论直播间")
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build(),
            LiveStream.builder()
                .id("stream-002")
                .name("测试直播间")
                .url("http://192.168.31.189:8086/live/stream2.m3u8")
                .type("hls")
                .description("测试用直播间")
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build()
        ));
        
        // 3. 初始化投票数据（默认0票，各占50%）
        votes.put("default", VoteData.builder()
                .leftVotes(0)
                .rightVotes(0)
                .totalVotes(0)
                .leftPercentage(50)
                .rightPercentage(50)
                .build());
        
        // 4. 初始化AI内容（包含正反方观点和评论）
        initAIContents();
        
        // 5. 初始化直播状态（默认离线）
        liveStatus.put("stream-001", true);
        liveStatus.put("stream-002", true);

        // 6. 初始化录播数据（模拟录播文件）
        recordings.addAll(Arrays.asList(
            Recording.builder()
                .id("recording-001")
                .objectKey("recordings/sample1.mp4")
                .filename("sample1.mp4")
                .title("辩论录播示例1")
                .description("这是一个示例录播文件，演示Minio存储和预签名URL播放")
                .duration(3600) // 1小时
                .size(1024L * 1024 * 500) // 500MB
                .width(1920)
                .height(1080)
                .format("mp4")
                .bucket("recordings")
                .enabled(true)
                .streamId("stream-001")
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build(),
            Recording.builder()
                .id("recording-002")
                .objectKey("recordings/sample2.mp4")
                .filename("sample2.mp4")
                .title("辩论录播示例2")
                .description("另一个示例录播文件，用于测试播放功能")
                .duration(1800) // 30分钟
                .size(1024L * 1024 * 300) // 300MB
                .width(1280)
                .height(720)
                .format("mp4")
                .bucket("recordings")
                .enabled(true)
                .streamId("stream-002")
                .createdAt(LocalDateTime.now().minusHours(12))
                .updatedAt(LocalDateTime.now().minusHours(12))
                .build()
        ));
    }
    
    /**
     * 初始化AI内容数据
     * <p>
     * 生成4条正方观点和4条反方观点，每条观点包含：
     * - 唯一ID
     * - 观点文本
     * - 所属方（left/right）
     * - 2条模拟评论
     * - 随机点赞数
     * </p>
     */
    private void initAIContents() {
        // 正方观点列表
        List<String> leftArguments = Arrays.asList(
            "痛苦是人生成长的必要经历，消除痛苦会让我们失去学习和成长的机会。",
            "痛苦让我们学会同理心，如果所有人都没有痛苦经历，我们如何理解他人的苦难？",
            "痛苦让我们珍惜快乐，没有对比就没有真正的幸福。",
            "如果所有人都按这个按钮，社会会变成什么样？"
        );
        
        // 反方观点列表
        List<String> rightArguments = Arrays.asList(
            "如果能够消除痛苦，为什么不呢？痛苦本身没有价值。",
            "现代医学已经在消除很多痛苦，这个按钮只是技术的延伸。",
            "每个人都有自己的选择权，不应该强迫别人承受痛苦。",
            "我们可以通过其他方式培养同理心，比如阅读、教育。"
        );
        
        // 生成正方AI内容
        for (int i = 0; i < leftArguments.size(); i++) {
            AIContent content = AIContent.builder()
                    .id("ai-" + UUID.randomUUID().toString().substring(0, 8))
                    .debateId(debateTopic.getId())
                    .text(leftArguments.get(i))
                    .side("left")
                    .timestamp(LocalDateTime.now().minusMinutes(i * 5))
                    .likes(faker.number().numberBetween(20, 80))
                    .comments(new ArrayList<>())
                    .statistics(new AIContent.Statistics(0, 0, 0))
                    .streamId("stream-001")
                    .build();
            
            // 为每条观点添加2条模拟评论
            for (int j = 0; j < 2; j++) {
                content.getComments().add(AIContent.Comment.builder()
                        .id("comment-" + UUID.randomUUID().toString().substring(0, 8))
                        .userId("user-" + j)
                        .nickname(faker.name().name())
                        .avatar(faker.internet().avatar())
                        .content(faker.lorem().sentence())
                        .likes(faker.number().numberBetween(5, 30))
                        .timestamp(LocalDateTime.now().minusMinutes(j * 2))
                        .build());
            }
            
            aiContents.add(content);
        }
        
        // 生成反方AI内容
        for (int i = 0; i < rightArguments.size(); i++) {
            AIContent content = AIContent.builder()
                    .id("ai-" + UUID.randomUUID().toString().substring(0, 8))
                    .debateId(debateTopic.getId())
                    .text(rightArguments.get(i))
                    .side("right")
                    .timestamp(LocalDateTime.now().minusMinutes(i * 5 + 2))
                    .likes(faker.number().numberBetween(20, 80))
                    .comments(new ArrayList<>())
                    .statistics(new AIContent.Statistics(0, 0, 0))
                    .streamId("stream-001")
                    .build();
            
            // 为每条观点添加2条模拟评论
            for (int j = 0; j < 2; j++) {
                content.getComments().add(AIContent.Comment.builder()
                        .id("comment-" + UUID.randomUUID().toString().substring(0, 8))
                        .userId("user-" + j)
                        .nickname(faker.name().name())
                        .avatar(faker.internet().avatar())
                        .content(faker.lorem().sentence())
                        .likes(faker.number().numberBetween(5, 30))
                        .timestamp(LocalDateTime.now().minusMinutes(j * 2))
                        .build());
            }
            
            aiContents.add(content);
        }
    }
    
    // ==================== 直播流管理方法 ====================
    
    /**
     * 获取所有直播流列表
     * 
     * @return 直播流列表的副本，防止外部修改原始数据
     */
    public List<LiveStream> getAllStreams() {
        return new ArrayList<>(streams);
    }
    
    /**
     * 根据ID获取单个直播流
     * 
     * @param id 直播流ID
     * @return 匹配的直播流，未找到返回null
     */
    public LiveStream getStreamById(String id) {
        return streams.stream()
                .filter(s -> s.getId().equals(id))
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 获取启用的直播流（当前活跃的）
     * 
     * @return 第一个enabled=true的直播流，未找到返回null
     */
    public LiveStream getActiveStream() {
        return streams.stream()
                .filter(s -> s.getEnabled() != null && s.getEnabled())
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 添加新的直播流
     * 自动生成ID和时间戳
     * 
     * @param stream 直播流信息（不含ID和时间戳）
     */
    public void addStream(LiveStream stream) {
        // 生成唯一ID
        stream.setId("stream-" + UUID.randomUUID().toString().substring(0, 8));
        // 设置创建和更新时间
        stream.setCreatedAt(LocalDateTime.now());
        stream.setUpdatedAt(LocalDateTime.now());
        // 添加到列表
        streams.add(stream);
        // 保存数据
        saveData();
    }
    
    /**
     * 更新直播流信息
     * 
     * @param id 要更新的直播流ID
     * @param stream 新的直播流信息
     */
    public void updateStream(String id, LiveStream stream) {
        LiveStream existing = getStreamById(id);
        if (existing != null) {
            // 更新字段
            existing.setName(stream.getName());
            existing.setUrl(stream.getUrl());
            existing.setType(stream.getType());
            existing.setDescription(stream.getDescription());
            existing.setEnabled(stream.getEnabled());
            // 更新时间戳
            existing.setUpdatedAt(LocalDateTime.now());
            // 保存数据
            saveData();
        }
    }
    
    /**
     * 删除直播流
     * 
     * @param id 要删除的直播流ID
     */
    public void deleteStream(String id) {
        streams.removeIf(s -> s.getId().equals(id));
        // 保存数据
        saveData();
    }
    
    // ==================== 投票管理方法 ====================
    
    /**
     * 获取投票数据
     * 
     * @param streamId 直播流ID（可为null，使用默认值）
     * @return 投票数据对象
     */
    public VoteData getVoteData(String streamId) {
        // 使用streamId作为key，如果为null则使用"default"
        return votes.getOrDefault(streamId != null ? streamId : "default", votes.get("default"));
    }
    
    /**
     * 更新投票数据
     * 自动计算：
     * - 总票数 = 左票 + 右票
     * - 左票百分比 = (左票 / 总票) * 100
     * - 右票百分比 = (右票 / 总票) * 100
     * 
     * @param streamId 直播流ID
     * @param newVotes 新的投票数据
     * @return 更新后的投票数据
     */
    public VoteData updateVoteData(String streamId, VoteData newVotes) {
        // 确定存储key
        String key = streamId != null ? streamId : "default";
        // 获取当前数据（如果不存在则创建）
        VoteData current = votes.getOrDefault(key, VoteData.builder().build());
        
        // 更新票数
        current.setLeftVotes(newVotes.getLeftVotes());
        current.setRightVotes(newVotes.getRightVotes());
        current.setTotalVotes(newVotes.getLeftVotes() + newVotes.getRightVotes());
        
        // 计算百分比
        int total = current.getTotalVotes();
        if (total > 0) {
            current.setLeftPercentage(Math.round((current.getLeftVotes() * 100.0f) / total));
            current.setRightPercentage(Math.round((current.getRightVotes() * 100.0f) / total));
        } else {
            // 无票时各占50%
            current.setLeftPercentage(50);
            current.setRightPercentage(50);
        }
        
        // 保存到Map
        votes.put(key, current);
        // 保存数据
        saveData();
        // 广播投票更新事件
        if (webSocketService != null) {
            webSocketService.broadcastVoteUpdate(current.getLeftVotes(), current.getRightVotes(), streamId);
        }
        return current;
    }
    
    /**
     * 添加投票（增量）
     * 
     * @param streamId 直播流ID
     * @param side 投票方（left/right）
     * @param voteCount 票数
     */
    public void addVote(String streamId, String side, Integer voteCount) {
        VoteData current = getVoteData(streamId);
        // 根据side增加对应票数
        if ("left".equals(side)) {
            current.setLeftVotes(current.getLeftVotes() + voteCount);
        } else if ("right".equals(side)) {
            current.setRightVotes(current.getRightVotes() + voteCount);
        }
        // 更新数据
        updateVoteData(streamId, current);
    }
    
    // ==================== AI内容管理方法 ====================
    
    /**
     * 获取AI内容列表
     * 
     * @param streamId 直播流ID（可为null，返回所有）
     * @return AI内容列表
     */
    public List<AIContent> getAIContents(String streamId) {
        // 如果指定了streamId，则过滤
        if (streamId != null) {
            return aiContents.stream()
                    .filter(c -> streamId.equals(c.getStreamId()))
                    .collect(Collectors.toList());
        }
        // 返回所有内容
        return new ArrayList<>(aiContents);
    }
    
    /**
     * 根据ID获取单个AI内容
     * 
     * @param id AI内容ID
     * @return AI内容对象，未找到返回null
     */
    public AIContent getAIContentById(String id) {
        return aiContents.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 添加新的AI内容
     * 自动生成ID和时间戳，初始化评论和统计数据
     * 
     * @param content AI内容（不含ID和时间戳）
     */
    public void addAIContent(AIContent content) {
        // 生成唯一ID
        content.setId("ai-" + UUID.randomUUID().toString().substring(0, 8));
        // 设置时间戳
        content.setTimestamp(LocalDateTime.now());
        // 初始化评论列表
        if (content.getComments() == null) {
            content.setComments(new ArrayList<>());
        }
        // 初始化统计数据
        if (content.getStatistics() == null) {
            content.setStatistics(new AIContent.Statistics(0, 0, 0));
        }
        // 添加到列表
        aiContents.add(content);
        // 保存数据
        saveData();
        // 广播新的AI识别内容事件
        if (webSocketService != null) {
            long timestamp = System.currentTimeMillis();
            webSocketService.broadcastAIContent(
                content.getId(),
                content.getText(),
                content.getSide(),
                timestamp,
                content.getStreamId()
            );
        }
    }
    
    /**
     * 更新AI内容
     * 
     * @param id AI内容ID
     * @param content 新的AI内容数据
     * @return 更新后的AI内容，未找到返回null
     */
    public AIContent updateAIContent(String id, AIContent content) {
        AIContent existing = getAIContentById(id);
        if (existing != null) {
            existing.setText(content.getText());
            existing.setSide(content.getSide());
            existing.setDebateId(content.getDebateId());
            existing.setStreamId(content.getStreamId());
            existing.setLikes(content.getLikes());
            // 保留原始评论和统计数据，除非提供新的
            if (content.getComments() != null) {
                existing.setComments(content.getComments());
            }
            if (content.getStatistics() != null) {
                existing.setStatistics(content.getStatistics());
            }
            // 保存数据
            saveData();
        }
        return existing;
    }
    
    /**
     * 删除AI内容
     * 
     * @param id AI内容ID
     * @return 删除成功返回true，未找到返回false
     */
    public boolean deleteAIContent(String id) {
        boolean removed = aiContents.removeIf(c -> c.getId().equals(id));
        if (removed) {
            saveData();
        }
        return removed;
    }
    
    /**
     * 获取AI内容的评论列表
     * 
     * @param contentId AI内容ID
     * @return 评论列表，未找到内容返回空列表
     */
    public List<AIContent.Comment> getAIContentComments(String contentId) {
        AIContent content = getAIContentById(contentId);
        if (content != null && content.getComments() != null) {
            return new ArrayList<>(content.getComments());
        }
        return new ArrayList<>();
    }
    
    /**
     * 删除AI内容的评论
     * 
     * @param contentId AI内容ID
     * @param commentId 评论ID
     * @return 删除成功返回true，未找到内容或评论返回false
     */
    public boolean deleteComment(String contentId, String commentId) {
        AIContent content = getAIContentById(contentId);
        if (content != null && content.getComments() != null) {
            boolean removed = content.getComments().removeIf(c -> c.getId().equals(commentId));
            if (removed) {
                saveData();
            }
            return removed;
        }
        return false;
    }
    
    // ==================== 直播状态管理方法 ====================
    
    /**
     * 获取直播状态
     * 
     * @param streamId 直播流ID
     * @return 直播状态（true=直播中，false=离线）
     */
    public Boolean getLiveStatus(String streamId) {
        return liveStatus.getOrDefault(streamId, false);
    }
    
    /**
     * 设置直播状态
     * 
     * @param streamId 直播流ID
     * @param status 状态（true=直播中，false=离线）
     */
    public void setLiveStatus(String streamId, Boolean status) {
        liveStatus.put(streamId, status);
        // 保存数据
        saveData();
        // 广播直播状态变化事件
        if (webSocketService != null) {
            // 获取直播流URL（如果存在）
            String streamUrl = null;
            LiveStream stream = getStreamById(streamId);
            if (stream != null) {
                streamUrl = stream.getUrl();
            }
            webSocketService.broadcastLiveStatus(status, streamUrl, streamId);
        }
    }
    
    // ==================== 辩题管理方法 ====================
    
    /**
     * 获取辩题信息
     * 
     * @return 辩题对象
     */
    public DebateTopic getDebateTopic() {
        return debateTopic;
    }
    
    /**
     * 更新辩题信息
     * 
     * @param topic 新的辩题信息
     */
    public void updateDebateTopic(DebateTopic topic) {
        this.debateTopic = topic;
        // 保存数据
        saveData();
    }

    // ==================== 录播管理方法 ====================

    /**
     * 获取所有录播列表
     * 
     * @return 录播列表的副本
     */
    public List<Recording> getAllRecordings() {
        return new ArrayList<>(recordings);
    }

    /**
     * 根据ID获取单个录播
     * 
     * @param id 录播ID
     * @return 匹配的录播，未找到返回null
     */
    public Recording getRecordingById(String id) {
        return recordings.stream()
                .filter(r -> r.getId().equals(id))
                .findFirst()
                .orElse(null);
    }

    /**
     * 添加新的录播
     * 自动生成ID和时间戳
     * 
     * @param recording 录播信息（不含ID和时间戳）
     */
    public void addRecording(Recording recording) {
        // 生成唯一ID
        recording.setId("recording-" + UUID.randomUUID().toString().substring(0, 8));
        // 设置创建和更新时间
        recording.setCreatedAt(LocalDateTime.now());
        recording.setUpdatedAt(LocalDateTime.now());
        // 确保bucket字段有值
        if (recording.getBucket() == null || recording.getBucket().isEmpty()) {
            recording.setBucket("recordings");
        }
        // 添加到列表
        recordings.add(recording);
        // 保存数据
        saveData();
    }

    /**
     * 更新录播信息
     * 
     * @param id 要更新的录播ID
     * @param recording 新的录播信息
     */
    public void updateRecording(String id, Recording recording) {
        Recording existing = getRecordingById(id);
        if (existing != null) {
            // 更新字段
            existing.setObjectKey(recording.getObjectKey());
            existing.setFilename(recording.getFilename());
            existing.setTitle(recording.getTitle());
            existing.setDescription(recording.getDescription());
            existing.setDuration(recording.getDuration());
            existing.setSize(recording.getSize());
            existing.setWidth(recording.getWidth());
            existing.setHeight(recording.getHeight());
            existing.setFormat(recording.getFormat());
            existing.setBucket(recording.getBucket());
            existing.setEnabled(recording.getEnabled());
            existing.setStreamId(recording.getStreamId());
            // 更新时间戳
            existing.setUpdatedAt(LocalDateTime.now());
            // 保存数据
            saveData();
        }
    }

    /**
     * 删除录播
     * 
     * @param id 要删除的录播ID
     * @return 是否删除成功
     */
    public boolean deleteRecording(String id) {
        boolean removed = recordings.removeIf(r -> r.getId().equals(id));
        if (removed) {
            saveData();
        }
        return removed;
    }

    /**
     * 根据对象键查找录播
     * 
     * @param objectKey Minio对象键
     * @return 录播对象，未找到返回null
     */
    public Recording getRecordingByObjectKey(String objectKey) {
        return recordings.stream()
                .filter(r -> objectKey.equals(r.getObjectKey()))
                .findFirst()
                .orElse(null);
    }
}