package com.debate.livedebateserver.service;

import com.debate.livedebateserver.model.DataContainer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * JSON文件存储服务
 * 负责将内存中的数据持久化到本地JSON文件，并在启动时加载数据
 *
 * @author lf
 * @version 1.0.0
 * @since 2026-04-03
 */
@Slf4j
@Service
public class JsonStorageService {
    
    /** JSON文件路径，默认：./data/data.json */
    @Value("${app.storage.file-path:./data/data.json}")
    private String filePath;
    
    /** Jackson ObjectMapper，配置支持Java 8时间类型 */
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());
    
    /**
     * 初始化，确保数据目录存在
     */
    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(filePath);
            Path parent = path.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
                log.info("创建数据目录：{}", parent.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("创建数据目录失败：{}", e.getMessage());
        }
    }
    
    /**
     * 保存数据到JSON文件
     * 
     * @param dataContainer 数据容器对象
     * @return 保存成功返回true，失败返回false
     */
    public boolean saveData(DataContainer dataContainer) {
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(filePath), dataContainer);
            log.info("数据已保存到：{}", filePath);
            return true;
        } catch (IOException e) {
            log.error("保存数据失败：{}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 从JSON文件加载数据
     * 
     * @return 数据容器对象，如果文件不存在或读取失败返回null
     */
    public DataContainer loadData() {
        File file = new File(filePath);
        if (!file.exists()) {
            log.info("数据文件不存在，将使用空数据：{}", filePath);
            return null;
        }
        
        try {
            DataContainer container = objectMapper.readValue(file, DataContainer.class);
            log.info("数据已从文件加载：{}", filePath);
            return container;
        } catch (IOException e) {
            log.error("加载数据失败：{}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 检查数据文件是否存在
     * 
     * @return 是否存在
     */
    public boolean dataFileExists() {
        return new File(filePath).exists();
    }
}