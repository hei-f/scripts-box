//! 重命名模式类型定义

/// 重命名模式
#[derive(Debug, Clone, Copy)]
pub enum RenameMode {
    /// 添加前缀
    AddPrefix,
    /// 添加后缀
    AddSuffix,
    /// 替换文本
    Replace,
    /// 批量编号
    Numbering,
}

impl RenameMode {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "add_prefix" => Some(Self::AddPrefix),
            "add_suffix" => Some(Self::AddSuffix),
            "replace" => Some(Self::Replace),
            "numbering" => Some(Self::Numbering),
            _ => None,
        }
    }
}
