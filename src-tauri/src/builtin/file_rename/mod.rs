//! 文件批量重命名脚本
//!
//! 提供文件批量重命名功能，支持前缀、后缀、替换等操作

mod operations;
mod schema;
mod script;
#[cfg(test)]
mod tests;
mod types;

pub use script::FileRenameScript;
