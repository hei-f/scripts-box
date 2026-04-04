//! 脚本注册中心模块
//!
//! 提供脚本注册、查询和管理功能，是脚本管理系统的核心组件

use std::collections::HashMap;
use std::sync::Arc;

use crate::error::AppError;
use crate::script_api::Script;

// 引入配置管理器类型（用于 from_config 方法签名）
// 注意：from_config 方法暂不实现，此引用为后续扩展预留
#[allow(unused_imports)]
use crate::config::ScriptConfigManager;

/// 脚本注册中心
///
/// 管理所有已注册的脚本实例，提供注册、查询和列表功能
/// 使用 Arc<dyn Script> 支持多线程共享
#[derive(Default)]
pub struct ScriptRegistry {
    /// 脚本存储映射
    ///
    /// Key: 脚本 ID
    /// Value: 脚本实例的 Arc 智能指针
    scripts: HashMap<String, Arc<dyn Script>>,
}

impl ScriptRegistry {
    /// 创建新的脚本注册中心
    ///
    /// # 返回
    /// 空的脚本注册中心实例
    pub fn new() -> Self {
        Self {
            scripts: HashMap::new(),
        }
    }

    /// 注册脚本
    ///
    /// 将脚本实例注册到注册中心，使用脚本的 ID 作为键
    /// 如果已存在相同 ID 的脚本，将覆盖原有脚本
    ///
    /// # 类型参数
    /// - `S`: 实现 Script trait 的脚本类型
    ///
    /// # 参数
    /// - `script`: 脚本实例
    pub fn register<S: Script + 'static>(&mut self, script: S) {
        let id = script.id().to_string();
        let script_arc = Arc::new(script);
        self.scripts.insert(id, script_arc);
    }

    /// 获取脚本
    ///
    /// 根据脚本 ID 查找并返回脚本实例
    ///
    /// # 参数
    /// - `id`: 脚本 ID
    ///
    /// # 返回
    /// 如果找到脚本，返回 Some(Arc<dyn Script>)，否则返回 None
    pub fn get(&self, id: &str) -> Option<Arc<dyn Script>> {
        self.scripts.get(id).cloned()
    }

    /// 列出所有脚本
    ///
    /// 返回注册中心中所有脚本的引用列表
    ///
    /// # 返回
    /// 脚本引用的向量
    pub fn list(&self) -> Vec<&Arc<dyn Script>> {
        self.scripts.values().collect()
    }

    /// 从配置文件加载脚本
    ///
    /// 根据配置管理器中的配置动态构建脚本实例
    /// 此方法暂不实现，预留接口供后续扩展
    ///
    /// # 参数
    /// - `_config`: 配置管理器引用（暂未使用）
    ///
    /// # 返回
    /// 成功返回脚本注册中心实例，失败返回错误
    ///
    /// # 注意
    /// 此方法目前为预留接口，调用将返回 NotImplementedError
    pub fn from_config(_config: &ScriptConfigManager) -> Result<Self, AppError> {
        // 暂不实现，返回未实现错误
        Err(AppError::NotFoundError(
            "from_config 方法暂未实现".to_string(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::script_api::{ParamDefinition, ScriptContext, ScriptResult};
    use serde_json::Value;

    /// 测试用例：简单的测试脚本
    struct TestScript {
        id: String,
        name: String,
        description: String,
    }

    impl TestScript {
        fn new(id: &str, name: &str, description: &str) -> Self {
            Self {
                id: id.to_string(),
                name: name.to_string(),
                description: description.to_string(),
            }
        }
    }

    impl Script for TestScript {
        fn id(&self) -> &str {
            &self.id
        }

        fn name(&self) -> &str {
            &self.name
        }

        fn description(&self) -> &str {
            &self.description
        }

        fn params_schema(&self) -> Vec<ParamDefinition> {
            vec![]
        }

        fn execute(&self, _params: Value, _ctx: &ScriptContext) -> Result<ScriptResult, AppError> {
            Ok(ScriptResult::success("测试脚本执行成功".to_string()))
        }
    }

    #[test]
    fn test_new_registry() {
        let registry = ScriptRegistry::new();
        assert!(registry.list().is_empty());
    }

    #[test]
    fn test_default_registry() {
        let registry = ScriptRegistry::default();
        assert!(registry.list().is_empty());
    }

    #[test]
    fn test_register_script() {
        let mut registry = ScriptRegistry::new();
        let script = TestScript::new("test-script", "测试脚本", "这是一个测试脚本");

        registry.register(script);

        let scripts = registry.list();
        assert_eq!(scripts.len(), 1);
        assert_eq!(scripts[0].id(), "test-script");
        assert_eq!(scripts[0].name(), "测试脚本");
    }

    #[test]
    fn test_get_script() {
        let mut registry = ScriptRegistry::new();
        let script = TestScript::new("test-script", "测试脚本", "这是一个测试脚本");

        registry.register(script);

        // 测试获取存在的脚本
        let found = registry.get("test-script");
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.id(), "test-script");

        // 测试获取不存在的脚本
        let not_found = registry.get("non-existent");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_register_override() {
        let mut registry = ScriptRegistry::new();

        // 注册第一个脚本
        let script1 = TestScript::new("test-script", "脚本1", "第一个脚本");
        registry.register(script1);

        // 注册相同 ID 的第二个脚本（覆盖）
        let script2 = TestScript::new("test-script", "脚本2", "第二个脚本");
        registry.register(script2);

        // 验证只有一个脚本
        let scripts = registry.list();
        assert_eq!(scripts.len(), 1);

        // 验证是第二个脚本
        let found = registry.get("test-script").unwrap();
        assert_eq!(found.name(), "脚本2");
        assert_eq!(found.description(), "第二个脚本");
    }

    #[test]
    fn test_list_multiple_scripts() {
        let mut registry = ScriptRegistry::new();

        registry.register(TestScript::new("script-1", "脚本1", "第一个脚本"));
        registry.register(TestScript::new("script-2", "脚本2", "第二个脚本"));
        registry.register(TestScript::new("script-3", "脚本3", "第三个脚本"));

        let scripts = registry.list();
        assert_eq!(scripts.len(), 3);
    }

    #[test]
    fn test_from_config_not_implemented() {
        // from_config 方法暂未实现，仅验证方法存在
        let _fn = ScriptRegistry::from_config;
    }

    #[test]
    fn test_script_execution() {
        let mut registry = ScriptRegistry::new();
        let script = TestScript::new("exec-test", "执行测试", "测试脚本执行");
        registry.register(script);

        let script = registry.get("exec-test").unwrap();
        let ctx = ScriptContext::default();
        let result = script.execute(Value::Null, &ctx);

        assert!(result.is_ok());
        let script_result = result.unwrap();
        assert!(script_result.success);
        assert_eq!(script_result.output, "测试脚本执行成功");
    }

    #[test]
    fn test_get_script_case_sensitive() {
        let mut registry = ScriptRegistry::new();
        registry.register(TestScript::new("Test-Script", "测试", "描述"));

        // ID 应该区分大小写
        assert!(registry.get("Test-Script").is_some());
        assert!(registry.get("test-script").is_none());
        assert!(registry.get("TEST-SCRIPT").is_none());
    }

    #[test]
    fn test_registry_with_special_characters_id() {
        let mut registry = ScriptRegistry::new();
        registry.register(TestScript::new("test_script-123", "测试", "描述"));

        let found = registry.get("test_script-123");
        assert!(found.is_some());
        assert_eq!(found.unwrap().id(), "test_script-123");
    }
}