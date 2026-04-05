//! 应用配置管理器模块
//!
//! 提供应用配置的加载、保存和管理功能

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::config::app_config::AppConfig;
use crate::constants::APP_CONFIG_FILE;
use crate::error::AppError;

/// 应用配置管理器
///
/// 负责应用配置文件的加载和保存
#[derive(Debug, Clone)]
pub struct AppConfigManager {
    /// 配置文件路径
    config_path: PathBuf,
    /// 配置内容
    config: AppConfig,
}

impl AppConfigManager {
    /// 从配置目录加载配置文件
    ///
    /// 如果配置文件不存在，则创建默认配置文件
    ///
    /// # 参数
    /// - `app_handle`: Tauri 应用句柄，用于获取配置目录
    ///
    /// # 返回
    /// 成功返回 AppConfigManager 实例，失败返回 AppError
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
        let config_path = config_dir.join(APP_CONFIG_FILE);

        // 加载或创建配置文件
        let config = if config_path.exists() {
            // 读取配置文件
            let content = fs::read_to_string(&config_path).map_err(|e| {
                AppError::ConfigError(format!("读取应用配置文件失败: {}", e))
            })?;

            // 解析配置文件，失败时使用默认配置
            serde_json::from_str(&content).unwrap_or_else(|e| {
                eprintln!("解析应用配置文件失败，使用默认配置: {}", e);
                AppConfig::default()
            })
        } else {
            // 创建默认配置文件
            let default_config = AppConfig::new();

            // 保存默认配置到文件
            let content = serde_json::to_string_pretty(&default_config)
                .map_err(|e| {
                    AppError::ConfigError(format!("序列化默认应用配置失败: {}", e))
                })?;

            fs::write(&config_path, &content).map_err(|e| {
                AppError::ConfigError(format!("写入默认应用配置文件失败: {}", e))
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
    /// # 返回
    /// 成功返回 Ok(())，失败返回 AppError
    pub fn save(&self) -> Result<(), AppError> {
        // 序列化配置
        let content = serde_json::to_string_pretty(&self.config).map_err(|e| {
            AppError::ConfigError(format!("序列化应用配置失败: {}", e))
        })?;

        // 写入配置文件
        fs::write(&self.config_path, &content).map_err(|e| {
            AppError::ConfigError(format!("写入应用配置文件失败: {}", e))
        })?;

        Ok(())
    }

    /// 获取配置
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    /// 获取可变配置引用
    pub fn get_config_mut(&mut self) -> &mut AppConfig {
        &mut self.config
    }

    /// 更新配置
    ///
    /// 更新配置并保存到文件
    pub fn update_config(&mut self, config: AppConfig) -> Result<(), AppError> {
        self.config = config;
        self.save()
    }

    /// 更新窗口配置
    pub fn update_window_config(
        &mut self,
        window_config: crate::config::app_config::WindowConfig,
    ) -> Result<(), AppError> {
        self.config.window = window_config;
        self.save()
    }

    /// 更新快捷键配置
    pub fn update_shortcut_config(
        &mut self,
        shortcut_config: crate::config::app_config::ShortcutConfig,
    ) -> Result<(), AppError> {
        self.config.shortcut = shortcut_config;
        self.save()
    }

    /// 更新托盘配置
    pub fn update_tray_config(
        &mut self,
        tray_config: crate::config::app_config::TrayConfig,
    ) -> Result<(), AppError> {
        self.config.tray = tray_config;
        self.save()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{CloseBehavior, ShortcutConfig, TrayConfig, WindowConfig};
    use tempfile::TempDir;

    /// 创建测试用的 AppConfigManager（不依赖 Tauri AppHandle）
    fn create_test_manager(temp_dir: &TempDir) -> AppConfigManager {
        let config_path = temp_dir.path().join(APP_CONFIG_FILE);
        AppConfigManager {
            config_path,
            config: AppConfig::default(),
        }
    }

    /// 创建测试用的 AppConfigManager（带自定义配置）
    fn create_test_manager_with_config(
        temp_dir: &TempDir,
        config: AppConfig,
    ) -> AppConfigManager {
        let config_path = temp_dir.path().join(APP_CONFIG_FILE);
        AppConfigManager {
            config_path,
            config,
        }
    }

    #[test]
    fn test_app_config_file_constant() {
        assert_eq!(APP_CONFIG_FILE, "app_config.json");
    }

    #[test]
    fn test_get_config() {
        let temp_dir = TempDir::new().unwrap();
        let manager = create_test_manager(&temp_dir);

        let config = manager.get_config();
        assert_eq!(config.version, "1.0");
        assert_eq!(config.window.close_behavior, CloseBehavior::MinimizeToTray);
        assert!(config.window.show_on_startup);
        assert!(config.shortcut.enabled);
        assert!(config.tray.show_icon);
    }

    #[test]
    fn test_get_config_mut() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        {
            let config = manager.get_config_mut();
            config.version = "2.0".to_string();
        }

        let config = manager.get_config();
        assert_eq!(config.version, "2.0");
    }

    #[test]
    fn test_save() {
        let temp_dir = TempDir::new().unwrap();
        let manager = create_test_manager(&temp_dir);

        // 保存配置
        manager.save().unwrap();

        // 验证文件已创建
        assert!(manager.config_path.exists());

        // 读取文件内容验证
        let content = fs::read_to_string(&manager.config_path).unwrap();
        assert!(content.contains("\"version\": \"1.0\""));
        // camelCase 序列化
        assert!(content.contains("\"closeBehavior\": \"minimizeToTray\""));
    }

    #[test]
    fn test_update_config() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        // 更新配置
        let new_config = AppConfig {
            version: "2.0".to_string(),
            window: WindowConfig {
                close_behavior: CloseBehavior::Quit,
                show_on_startup: false,
            },
            shortcut: ShortcutConfig {
                quick_execution: "Ctrl+P".to_string(),
                enabled: false,
            },
            tray: TrayConfig {
                show_icon: false,
                show_in_dock: false,
            },
        };

        manager.update_config(new_config.clone()).unwrap();

        // 验证内存中的配置已更新
        let config = manager.get_config();
        assert_eq!(config.version, "2.0");
        assert_eq!(config.window.close_behavior, CloseBehavior::Quit);
        assert!(!config.window.show_on_startup);
        assert!(!config.shortcut.enabled);
        assert!(!config.tray.show_icon);

        // 验证文件已保存
        let content = fs::read_to_string(&manager.config_path).unwrap();
        assert!(content.contains("\"version\": \"2.0\""));
    }

    #[test]
    fn test_update_window_config() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        // 更新窗口配置
        let new_window_config = WindowConfig {
            close_behavior: CloseBehavior::Quit,
            show_on_startup: false,
        };

        manager.update_window_config(new_window_config).unwrap();

        // 验证配置已更新
        let config = manager.get_config();
        assert_eq!(config.window.close_behavior, CloseBehavior::Quit);
        assert!(!config.window.show_on_startup);

        // 其他配置应保持不变
        assert!(config.shortcut.enabled);
        assert!(config.tray.show_icon);
    }

    #[test]
    fn test_update_shortcut_config() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        // 更新快捷键配置
        let new_shortcut_config = ShortcutConfig {
            quick_execution: "Ctrl+Alt+X".to_string(),
            enabled: false,
        };

        manager.update_shortcut_config(new_shortcut_config).unwrap();

        // 验证配置已更新
        let config = manager.get_config();
        assert_eq!(config.shortcut.quick_execution, "Ctrl+Alt+X");
        assert!(!config.shortcut.enabled);

        // 其他配置应保持不变
        assert_eq!(config.window.close_behavior, CloseBehavior::MinimizeToTray);
        assert!(config.tray.show_icon);
    }

    #[test]
    fn test_update_tray_config() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        // 更新托盘配置
        let new_tray_config = TrayConfig {
            show_icon: false,
            show_in_dock: false,
        };

        manager.update_tray_config(new_tray_config).unwrap();

        // 验证配置已更新
        let config = manager.get_config();
        assert!(!config.tray.show_icon);
        assert!(!config.tray.show_in_dock);

        // 其他配置应保持不变
        assert_eq!(config.window.close_behavior, CloseBehavior::MinimizeToTray);
        assert!(config.shortcut.enabled);
    }

    #[test]
    fn test_save_creates_formatted_json() {
        let temp_dir = TempDir::new().unwrap();
        let manager = create_test_manager(&temp_dir);

        manager.save().unwrap();

        // 读取保存的文件内容
        let content = fs::read_to_string(&manager.config_path).unwrap();

        // 验证 JSON 格式化（包含换行和缩进）
        assert!(content.contains('\n'));
        assert!(content.contains("  ")); // 缩进

        // 验证可以正确解析
        let parsed: AppConfig = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed, AppConfig::default());
    }

    #[test]
    fn test_manager_clone() {
        let temp_dir = TempDir::new().unwrap();
        let manager = create_test_manager(&temp_dir);

        let cloned = manager.clone();

        // 验证克隆后的配置相同
        assert_eq!(manager.get_config(), cloned.get_config());

        // 路径也应该相同
        assert_eq!(manager.config_path, cloned.config_path);
    }

    #[test]
    fn test_manager_debug() {
        let temp_dir = TempDir::new().unwrap();
        let manager = create_test_manager(&temp_dir);

        let debug_str = format!("{:?}", manager);
        assert!(debug_str.contains("AppConfigManager"));
        assert!(debug_str.contains("config_path"));
        assert!(debug_str.contains("config"));
    }

    #[test]
    fn test_multiple_saves() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = create_test_manager(&temp_dir);

        // 第一次保存
        manager.save().unwrap();

        // 更新并再次保存
        manager.get_config_mut().version = "2.0".to_string();
        manager.save().unwrap();

        // 再次更新并保存
        manager.get_config_mut().version = "3.0".to_string();
        manager.save().unwrap();

        // 验证最终内容
        let content = fs::read_to_string(&manager.config_path).unwrap();
        assert!(content.contains("\"version\": \"3.0\""));
    }

    #[test]
    fn test_save_to_nonexistent_directory() {
        let temp_dir = TempDir::new().unwrap();
        let nonexistent_path = temp_dir.path().join("nonexistent").join("subdir").join("config.json");

        let manager = AppConfigManager {
            config_path: nonexistent_path.clone(),
            config: AppConfig::default(),
        };

        // 保存到不存在的目录应该失败
        let result = manager.save();
        assert!(result.is_err());
    }
}
