//! 内置脚本模块
//!
//! 提供一系列内置脚本实现，所有脚本均实现 Script trait

mod add_numbers;
mod file_rename;

pub use add_numbers::AddNumbersScript;
pub use file_rename::FileRenameScript;

use crate::registry::ScriptRegistry;

/// 注册所有内置脚本到脚本注册中心
///
/// # 参数
/// - `registry`: 脚本注册中心可变引用
pub fn register_builtin_scripts(registry: &mut ScriptRegistry) {
    registry.register(AddNumbersScript::new());
    registry.register(FileRenameScript::new());
}
