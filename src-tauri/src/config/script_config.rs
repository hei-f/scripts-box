//! 脚本配置数据结构模块
//!
//! 定义配置文件的数据结构和验证逻辑，用于持久化脚本配置

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::error::AppError;
use crate::script_api::ParamDefinition;

/// 配置文件版本号常量
const CONFIG_VERSION: &str = "1.0";

/// 单个脚本配置结构体
///
/// 定义脚本的所有配置信息，用于配置文件持久化和前端展示
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptConfig {
    /// 脚本唯一标识
    ///
    /// 用于在系统中唯一标识脚本，必须全局唯一
    pub id: String,

    /// 脚本显示名称
    ///
    /// 用于在前端界面显示
    pub name: String,

    /// 脚本描述
    ///
    /// 用于说明脚本的用途和功能
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// 参数定义列表
    ///
    /// 定义脚本执行所需的参数，前端据此生成动态表单
    #[serde(default)]
    pub params: Vec<ParamDefinition>,

    /// 是否启用
    ///
    /// 控制脚本是否可在系统中使用
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// 命令类型
    ///
    /// 标识脚本的实现类型，如 builtin（内置命令）、python（Python 脚本）等
    pub command_type: String,
}

/// enabled 字段的默认值函数
fn default_enabled() -> bool {
    true
}

impl ScriptConfig {
    /// 验证脚本配置的有效性
    ///
    /// # 验证规则
    /// - ID 不能为空
    /// - name 不能为空
    /// - command_type 不能为空
    /// - params 中的参数 name 不能重复
    ///
    /// # 返回
    /// 验证通过返回 Ok(())，验证失败返回 AppError::ValidationError
    pub fn validate(&self) -> Result<(), AppError> {
        // 验证 ID 不为空
        if self.id.trim().is_empty() {
            return Err(AppError::ValidationError("脚本 ID 不能为空".to_string()));
        }

        // 验证 name 不为空
        if self.name.trim().is_empty() {
            return Err(AppError::ValidationError(
                "脚本名称不能为空".to_string(),
            ));
        }

        // 验证 command_type 不为空
        if self.command_type.trim().is_empty() {
            return Err(AppError::ValidationError(
                "命令类型不能为空".to_string(),
            ));
        }

        // 验证参数名称不重复
        let mut param_names = HashSet::new();
        for param in &self.params {
            if !param_names.insert(&param.name) {
                return Err(AppError::ValidationError(format!(
                    "参数名称重复: {}",
                    param.name
                )));
            }
        }

        Ok(())
    }
}

/// 配置文件根结构
///
/// 配置文件的顶层结构，包含版本号和脚本列表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptsConfigFile {
    /// 配置文件版本号
    ///
    /// 用于后续版本迁移和兼容性检查
    pub version: String,

    /// 脚本配置列表
    pub scripts: Vec<ScriptConfig>,
}

impl ScriptsConfigFile {
    /// 创建新的配置文件结构
    ///
    /// 使用当前版本号初始化空的配置文件
    pub fn new() -> Self {
        Self {
            version: CONFIG_VERSION.to_string(),
            scripts: Vec::new(),
        }
    }

    /// 验证配置文件的有效性
    ///
    /// # 验证规则
    /// - 所有脚本的 ID 必须唯一
    /// - 每个脚本配置必须通过自身的 validate() 验证
    ///
    /// # 返回
    /// 验证通过返回 Ok(())，验证失败返回 AppError::ValidationError
    pub fn validate(&self) -> Result<(), AppError> {
        // 检查 ID 唯一性
        let mut ids = HashSet::new();
        for script in &self.scripts {
            // 先验证单个脚本配置
            script.validate()?;

            // 再检查 ID 唯一性
            if !ids.insert(&script.id) {
                return Err(AppError::ValidationError(format!(
                    "脚本 ID 重复: {}",
                    script.id
                )));
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
    /// 找到返回引用，未找到返回 None
    pub fn get_script(&self, id: &str) -> Option<&ScriptConfig> {
        self.scripts.iter().find(|s| s.id == id)
    }

    /// 添加脚本配置
    ///
    /// # 参数
    /// - `config`: 要添加的脚本配置
    ///
    /// # 返回
    /// 成功返回 Ok(())，ID 重复返回错误
    pub fn add_script(&mut self, config: ScriptConfig) -> Result<(), AppError> {
        // 先验证配置
        config.validate()?;

        // 检查 ID 是否已存在
        if self.get_script(&config.id).is_some() {
            return Err(AppError::ValidationError(format!(
                "脚本 ID 已存在: {}",
                config.id
            )));
        }

        self.scripts.push(config);
        Ok(())
    }

    /// 更新脚本配置
    ///
    /// # 参数
    /// - `id`: 要更新的脚本ID
    /// - `config`: 新的脚本配置
    ///
    /// # 返回
    /// 成功返回 Ok(())，脚本不存在或新 ID 与其他脚本冲突返回错误
    pub fn update_script(&mut self, id: &str, config: ScriptConfig) -> Result<(), AppError> {
        // 先验证配置
        config.validate()?;

        // 查找脚本位置
        let index = self
            .scripts
            .iter()
            .position(|s| s.id == id)
            .ok_or_else(|| AppError::NotFoundError(format!("脚本不存在: {}", id)))?;

        // 如果 ID 改变了，检查新 ID 是否与其他脚本冲突
        if config.id != id && self.get_script(&config.id).is_some() {
            return Err(AppError::ValidationError(format!(
                "脚本 ID 已存在: {}",
                config.id
            )));
        }

        self.scripts[index] = config;
        Ok(())
    }

    /// 删除脚本配置
    ///
    /// # 参数
    /// - `id`: 要删除的脚本ID
    ///
    /// # 返回
    /// 成功返回 Ok(())，脚本不存在返回错误
    pub fn delete_script(&mut self, id: &str) -> Result<(), AppError> {
        let initial_len = self.scripts.len();
        self.scripts.retain(|s| s.id != id);

        if self.scripts.len() == initial_len {
            return Err(AppError::NotFoundError(format!("脚本不存在: {}", id)));
        }

        Ok(())
    }
}

impl Default for ScriptsConfigFile {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::script_api::ParamType;

    fn create_test_config() -> ScriptConfig {
        ScriptConfig {
            id: "test-script".to_string(),
            name: "测试脚本".to_string(),
            description: Some("这是一个测试脚本".to_string()),
            params: vec![ParamDefinition {
                name: "directory".to_string(),
                label: "目标目录".to_string(),
                param_type: ParamType::DirectoryPath,
                required: true,
                default: None,
                description: Some("选择要处理的目录".to_string()),
                show_when: None,
            }],
            enabled: true,
            command_type: "builtin".to_string(),
        }
    }

    #[test]
    fn test_script_config_validate_success() {
        let config = create_test_config();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_script_config_validate_empty_id() {
        let mut config = create_test_config();
        config.id = "".to_string();
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }

    #[test]
    fn test_script_config_validate_empty_name() {
        let mut config = create_test_config();
        config.name = "".to_string();
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }

    #[test]
    fn test_script_config_validate_empty_command_type() {
        let mut config = create_test_config();
        config.command_type = "".to_string();
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }

    #[test]
    fn test_scripts_config_file_new() {
        let config_file = ScriptsConfigFile::new();
        assert_eq!(config_file.version, "1.0");
        assert!(config_file.scripts.is_empty());
    }

    #[test]
    fn test_scripts_config_file_add_script() {
        let mut config_file = ScriptsConfigFile::new();
        let config = create_test_config();

        assert!(config_file.add_script(config).is_ok());
        assert_eq!(config_file.scripts.len(), 1);

        // 添加重复 ID 应该失败
        let config2 = create_test_config();
        assert!(config_file.add_script(config2).is_err());
    }

    #[test]
    fn test_scripts_config_file_get_script() {
        let mut config_file = ScriptsConfigFile::new();
        let config = create_test_config();
        config_file.add_script(config.clone()).unwrap();

        let found = config_file.get_script("test-script");
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "测试脚本");

        let not_found = config_file.get_script("non-existent");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_scripts_config_file_update_script() {
        let mut config_file = ScriptsConfigFile::new();
        let config = create_test_config();
        config_file.add_script(config).unwrap();

        // 更新脚本
        let mut updated_config = create_test_config();
        updated_config.name = "更新后的名称".to_string();
        assert!(config_file.update_script("test-script", updated_config).is_ok());

        let found = config_file.get_script("test-script").unwrap();
        assert_eq!(found.name, "更新后的名称");

        // 更新不存在的脚本应该失败
        let config2 = create_test_config();
        assert!(config_file.update_script("non-existent", config2).is_err());
    }

    #[test]
    fn test_scripts_config_file_delete_script() {
        let mut config_file = ScriptsConfigFile::new();
        let config = create_test_config();
        config_file.add_script(config).unwrap();

        assert!(config_file.delete_script("test-script").is_ok());
        assert!(config_file.scripts.is_empty());

        // 删除不存在的脚本应该失败
        assert!(config_file.delete_script("non-existent").is_err());
    }

    #[test]
    fn test_scripts_config_file_validate_duplicate_id() {
        let mut config_file = ScriptsConfigFile::new();

        let config1 = create_test_config();
        let mut config2 = create_test_config();
        config2.id = "test-script".to_string(); // 与 config1 相同的 ID

        config_file.scripts.push(config1);
        config_file.scripts.push(config2);

        let result = config_file.validate();
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }
}
