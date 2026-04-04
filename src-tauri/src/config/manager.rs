//! 配置文件管理器模块
//!
//! 提供配置文件的加载、保存、备份和管理功能

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::config::script_config::{ScriptConfig, ScriptsConfigFile};
use crate::error::AppError;

/// 配置文件名常量
const SCRIPTS_CONFIG_FILE: &str = "scripts.json";

/// 备份文件前缀
const BACKUP_FILE_PREFIX: &str = "scripts.backup.";

/// 备份文件扩展名
const BACKUP_FILE_EXTENSION: &str = ".json";

/// 最大备份文件数量
const MAX_BACKUP_COUNT: usize = 5;

/// 脚本配置管理器
///
/// 负责配置文件的加载、保存、备份和 CRUD 操作
#[derive(Debug, Clone)]
pub struct ScriptConfigManager {
    /// 配置文件路径
    config_path: PathBuf,

    /// 配置文件内容
    config: ScriptsConfigFile,
}

impl ScriptConfigManager {
    /// 从配置目录加载配置文件
    ///
    /// 如果配置文件不存在，则创建默认配置文件
    ///
    /// # 参数
    /// - `app_handle`: Tauri 应用句柄，用于获取配置目录
    ///
    /// # 返回
    /// 成功返回 ScriptConfigManager 实例，失败返回 AppError
    pub fn load(app_handle: &AppHandle) -> Result<Self, AppError> {
        // 获取配置目录
        let config_dir = app_handle
            .path()
            .config_dir()
            .map_err(|e| AppError::ConfigError(format!("获取配置目录失败: {}", e)))?;

        // 确保配置目录存在
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| {
                AppError::ConfigError(format!("创建配置目录失败: {}", e))
            })?;
        }

        // 构建配置文件路径
        let config_path = config_dir.join(SCRIPTS_CONFIG_FILE);

        // 加载或创建配置文件
        let config = if config_path.exists() {
            // 读取配置文件
            let content = fs::read_to_string(&config_path).map_err(|e| {
                AppError::ConfigError(format!("读取配置文件失败: {}", e))
            })?;

            // 解析配置文件
            serde_json::from_str(&content).map_err(|e| {
                AppError::ConfigError(format!("解析配置文件失败: {}", e))
            })?
        } else {
            // 创建默认配置文件
            let default_config = ScriptsConfigFile::new();

            // 保存默认配置到文件
            let content = serde_json::to_string_pretty(&default_config)
                .map_err(|e| {
                    AppError::ConfigError(format!("序列化默认配置失败: {}", e))
                })?;

            fs::write(&config_path, &content).map_err(|e| {
                AppError::ConfigError(format!("写入默认配置文件失败: {}", e))
            })?;

            default_config
        };

        Ok(Self {
            config_path,
            config,
        })
    }

    /// 保存配置到文件
    ///
    /// 保存前会先创建备份，并清理旧的备份文件
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    pub fn save(&self) -> Result<(), AppError> {
        // 创建备份
        self.create_backup()?;

        // 序列化配置
        let content = serde_json::to_string_pretty(&self.config).map_err(|e| {
            AppError::ConfigError(format!("序列化配置失败: {}", e))
        })?;

        // 写入配置文件
        fs::write(&self.config_path, &content).map_err(|e| {
            AppError::ConfigError(format!("写入配置文件失败: {}", e))
        })?;

        Ok(())
    }

    /// 创建配置文件备份
    ///
    /// 备份文件命名格式: scripts.backup.{timestamp}.json
    /// 保留最近 MAX_BACKUP_COUNT 个备份文件
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    fn create_backup(&self) -> Result<(), AppError> {
        // 如果配置文件不存在，无需备份
        if !self.config_path.exists() {
            return Ok(());
        }

        let config_dir = self.config_path.parent().ok_or_else(|| {
            AppError::ConfigError("无法获取配置文件目录".to_string())
        })?;

        // 生成备份文件名（使用当前时间戳）
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let backup_file_name = format!("{}{}{}", BACKUP_FILE_PREFIX, timestamp, BACKUP_FILE_EXTENSION);
        let backup_path = config_dir.join(&backup_file_name);

        // 复制当前配置文件到备份文件
        fs::copy(&self.config_path, &backup_path).map_err(|e| {
            AppError::ConfigError(format!("创建备份文件失败: {}", e))
        })?;

        // 清理旧备份文件，只保留最近的 MAX_BACKUP_COUNT 个
        self.cleanup_old_backups(config_dir)?;

        Ok(())
    }

    /// 清理旧备份文件
    ///
    /// 保留最近 MAX_BACKUP_COUNT 个备份文件，删除其余的
    ///
    /// # 参数
    /// - `config_dir`: 配置文件目录
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    fn cleanup_old_backups(&self, config_dir: &std::path::Path) -> Result<(), AppError> {
        // 收集所有备份文件
        let mut backup_files: Vec<(String, std::time::SystemTime)> = Vec::new();

        let entries = fs::read_dir(config_dir).map_err(|e| {
            AppError::ConfigError(format!("读取配置目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::ConfigError(format!("读取目录条目失败: {}", e))
            })?;

            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            // 检查是否是备份文件
            if file_name_str.starts_with(BACKUP_FILE_PREFIX)
                && file_name_str.ends_with(BACKUP_FILE_EXTENSION)
            {
                // 获取文件的修改时间
                let metadata = entry.metadata().map_err(|e| {
                    AppError::ConfigError(format!("读取文件元数据失败: {}", e))
                })?;

                let modified_time = metadata.modified().map_err(|e| {
                    AppError::ConfigError(format!("获取文件修改时间失败: {}", e))
                })?;

                backup_files.push((file_name_str.to_string(), modified_time));
            }
        }

        // 按修改时间排序（最新的在前）
        backup_files.sort_by(|a, b| b.1.cmp(&a.1));

        // 删除超出数量的旧备份文件
        if backup_files.len() > MAX_BACKUP_COUNT {
            for (file_name, _) in backup_files.iter().skip(MAX_BACKUP_COUNT) {
                let file_path = config_dir.join(file_name);
                fs::remove_file(&file_path).map_err(|e| {
                    AppError::ConfigError(format!("删除旧备份文件失败: {}", e))
                })?;
            }
        }

        Ok(())
    }

    /// 根据ID获取脚本配置
    ///
    /// # 参数
    /// - `id`: 脚本ID
    ///
    /// # 返回
    /// 找到返回脚本配置引用，未找到返回 None
    pub fn get_script(&self, id: &str) -> Option<&ScriptConfig> {
        self.config.get_script(id)
    }

    /// 添加脚本配置
    ///
    /// # 参数
    /// - `config`: 要添加的脚本配置
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    pub fn add_script(&mut self, config: ScriptConfig) -> Result<(), AppError> {
        self.config.add_script(config)
    }

    /// 更新脚本配置
    ///
    /// # 参数
    /// - `id`: 要更新的脚本ID
    /// - `config`: 新的脚本配置
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    pub fn update_script(&mut self, id: &str, config: ScriptConfig) -> Result<(), AppError> {
        self.config.update_script(id, config)
    }

    /// 删除脚本配置
    ///
    /// # 参数
    /// - `id`: 要删除的脚本ID
    ///
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    pub fn delete_script(&mut self, id: &str) -> Result<(), AppError> {
        self.config.delete_script(id)
    }

    /// 列出所有脚本配置
    ///
    /// # 返回
    /// 返回所有脚本配置的切片引用
    pub fn list_scripts(&self) -> &[ScriptConfig] {
        &self.config.scripts
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 注意：load 方法需要 AppHandle，无法在单元测试中直接测试
    // 集成测试应该在有 Tauri 环境的情况下进行

    #[test]
    fn test_constants() {
        assert_eq!(SCRIPTS_CONFIG_FILE, "scripts.json");
        assert_eq!(BACKUP_FILE_PREFIX, "scripts.backup.");
        assert_eq!(BACKUP_FILE_EXTENSION, ".json");
        assert_eq!(MAX_BACKUP_COUNT, 5);
    }
}
