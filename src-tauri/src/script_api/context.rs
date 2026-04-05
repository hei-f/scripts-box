//! 脚本执行上下文
//!
//! 提供脚本执行时的环境信息和资源路径

use std::path::PathBuf;

/// 脚本执行上下文
///
/// 提供脚本执行时的环境信息和资源路径
#[derive(Debug, Clone)]
pub struct ScriptContext {
    /// 日志目录路径
    pub log_dir: PathBuf,
    /// 临时文件目录路径
    pub temp_dir: PathBuf,
}

impl Default for ScriptContext {
    fn default() -> Self {
        Self {
            log_dir: std::env::temp_dir().join("scripts-box").join("logs"),
            temp_dir: std::env::temp_dir().join("scripts-box").join("temp"),
        }
    }
}
