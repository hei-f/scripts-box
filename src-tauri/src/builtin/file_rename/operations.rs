//! 文件重命名操作实现

use std::fs;
use std::path::Path;

use crate::error::AppError;

use super::types::RenameMode;

/// 执行文件重命名操作
///
/// # 参数
/// - `directory`: 目标目录
/// - `mode`: 重命名模式
/// - `params`: 操作参数
///
/// # 返回
/// 成功返回 (成功数量, 失败数量)
pub fn execute_rename(
    directory: &Path,
    mode: RenameMode,
    params: &serde_json::Value,
) -> Result<(usize, usize), AppError> {
    let mut success_count = 0;
    let mut fail_count = 0;

    // 读取目录内容
    let entries = fs::read_dir(directory).map_err(|e| {
        AppError::FileSystemError(format!("无法读取目录 {:?}: {}", directory, e))
    })?;

    // 过滤出文件（排除目录）
    let mut files: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_file())
        .collect();

    // 根据模式执行重命名
    match mode {
        RenameMode::AddPrefix => {
            let prefix = params["prefix"].as_str().unwrap_or("");
            if prefix.is_empty() {
                return Err(AppError::ValidationError("前缀不能为空".to_string()));
            }

            for entry in files {
                let path = entry.path();
                if let Some(filename) = path.file_name() {
                    let new_name = format!("{}{}", prefix, filename.to_string_lossy());
                    let new_path = path.with_file_name(&new_name);

                    match fs::rename(&path, &new_path) {
                        Ok(()) => success_count += 1,
                        Err(e) => {
                            log::warn!("重命名 {:?} 失败: {}", path, e);
                            fail_count += 1;
                        }
                    }
                }
            }
        }
        RenameMode::AddSuffix => {
            let suffix = params["suffix"].as_str().unwrap_or("");
            if suffix.is_empty() {
                return Err(AppError::ValidationError("后缀不能为空".to_string()));
            }

            for entry in files {
                let path = entry.path();
                let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");

                let new_name = if ext.is_empty() {
                    format!("{}{}", stem, suffix)
                } else {
                    format!("{}{}.{}", stem, suffix, ext)
                };
                let new_path = path.with_file_name(&new_name);

                match fs::rename(&path, &new_path) {
                    Ok(()) => success_count += 1,
                    Err(e) => {
                        log::warn!("重命名 {:?} 失败: {}", path, e);
                        fail_count += 1;
                    }
                }
            }
        }
        RenameMode::Replace => {
            let old_text = params["old_text"].as_str().unwrap_or("");
            let new_text = params["new_text"].as_str().unwrap_or("");

            if old_text.is_empty() {
                return Err(AppError::ValidationError("要替换的文本不能为空".to_string()));
            }

            for entry in files {
                let path = entry.path();
                if let Some(filename) = path.file_name() {
                    let filename_str = filename.to_string_lossy();
                    let new_name = filename_str.replace(old_text, new_text);

                    if new_name != filename_str {
                        let new_path = path.with_file_name(&new_name);

                        match fs::rename(&path, &new_path) {
                            Ok(()) => success_count += 1,
                            Err(e) => {
                                log::warn!("重命名 {:?} 失败: {}", path, e);
                                fail_count += 1;
                            }
                        }
                    }
                }
            }
        }
        RenameMode::Numbering => {
            let start = params["start_number"].as_u64().unwrap_or(1) as usize;
            let digits = params["digits"].as_u64().unwrap_or(3) as usize;
            let separator = params["separator"].as_str().unwrap_or("_");

            // 按文件名排序
            files.sort_by_key(|a| a.file_name());

            for (idx, entry) in files.into_iter().enumerate() {
                let path = entry.path();
                let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");

                let number = start + idx;
                let number_str = format!("{:0>width$}", number, width = digits);

                let new_name = if ext.is_empty() {
                    format!("{}{}{}", stem, separator, number_str)
                } else {
                    format!("{}{}{}.{}", stem, separator, number_str, ext)
                };
                let new_path = path.with_file_name(&new_name);

                match fs::rename(&path, &new_path) {
                    Ok(()) => success_count += 1,
                    Err(e) => {
                        log::warn!("重命名 {:?} 失败: {}", path, e);
                        fail_count += 1;
                    }
                }
            }
        }
    }

    Ok((success_count, fail_count))
}
