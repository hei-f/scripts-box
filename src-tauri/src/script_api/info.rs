//! 脚本元信息
//!
//! 用于在前端展示脚本的基本信息

use serde::{Deserialize, Serialize};

/// 脚本元信息
///
/// 用于在前端展示脚本的基本信息（ID、名称、描述）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptInfo {
    /// 脚本唯一标识
    pub id: String,
    /// 脚本显示名称
    pub name: String,
    /// 脚本描述
    pub description: String,
}
