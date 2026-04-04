//! 文件批量重命名脚本
//!
//! 提供文件批量重命名功能，支持前缀、后缀、替换等操作

use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::error::AppError;
use crate::script_api::{DisplayCondition, ParamDefinition, ParamType, Script, ScriptContext, ScriptResult, SelectOption};

/// 重命名模式
#[derive(Debug, Clone, Copy)]
enum RenameMode {
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
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "add_prefix" => Some(Self::AddPrefix),
            "add_suffix" => Some(Self::AddSuffix),
            "replace" => Some(Self::Replace),
            "numbering" => Some(Self::Numbering),
            _ => None,
        }
    }
}

/// 文件批量重命名脚本
pub struct FileRenameScript {
    id: String,
    name: String,
    description: String,
}

impl FileRenameScript {
    /// 创建新的文件重命名脚本实例
    pub fn new() -> Self {
        Self {
            id: "file_rename".to_string(),
            name: "文件批量重命名".to_string(),
            description: "批量重命名指定目录下的文件，支持添加前缀、后缀、文本替换和编号等功能".to_string(),
        }
    }

    /// 获取重命名模式参数定义
    fn get_rename_mode_options() -> Vec<SelectOption> {
        vec![
            SelectOption {
                value: "add_prefix".to_string(),
                label: "添加前缀".to_string(),
            },
            SelectOption {
                value: "add_suffix".to_string(),
                label: "添加后缀".to_string(),
            },
            SelectOption {
                value: "replace".to_string(),
                label: "替换文本".to_string(),
            },
            SelectOption {
                value: "numbering".to_string(),
                label: "批量编号".to_string(),
            },
        ]
    }

    /// 执行文件重命名
    fn execute_rename(
        &self,
        directory: &Path,
        mode: RenameMode,
        params: &Value,
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
}

impl Default for FileRenameScript {
    fn default() -> Self {
        Self::new()
    }
}

impl Script for FileRenameScript {
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
        vec![
            ParamDefinition {
                name: "directory".to_string(),
                label: "目标目录".to_string(),
                param_type: ParamType::DirectoryPath,
                required: true,
                default: None,
                description: Some("选择要重命名文件所在的目录".to_string()),
                show_when: None,
            },
            ParamDefinition {
                name: "mode".to_string(),
                label: "重命名模式".to_string(),
                param_type: ParamType::Select {
                    options: Self::get_rename_mode_options(),
                },
                required: true,
                default: Some(Value::String("add_prefix".to_string())),
                description: Some("选择重命名模式".to_string()),
                show_when: None,
            },
            // 添加前缀模式的参数
            ParamDefinition {
                name: "prefix".to_string(),
                label: "前缀文本".to_string(),
                param_type: ParamType::Text,
                required: true,
                default: None,
                description: Some("输入要添加的前缀文本".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["add_prefix".to_string()],
                }),
            },
            // 添加后缀模式的参数
            ParamDefinition {
                name: "suffix".to_string(),
                label: "后缀文本".to_string(),
                param_type: ParamType::Text,
                required: true,
                default: None,
                description: Some("输入要添加的后缀文本".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["add_suffix".to_string()],
                }),
            },
            // 替换文本模式的参数
            ParamDefinition {
                name: "old_text".to_string(),
                label: "原文本".to_string(),
                param_type: ParamType::Text,
                required: true,
                default: None,
                description: Some("输入要被替换的文本".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["replace".to_string()],
                }),
            },
            ParamDefinition {
                name: "new_text".to_string(),
                label: "新文本".to_string(),
                param_type: ParamType::Text,
                required: false,
                default: Some(Value::String(String::new())),
                description: Some("输入替换后的文本（可为空）".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["replace".to_string()],
                }),
            },
            // 批量编号模式的参数
            ParamDefinition {
                name: "start_number".to_string(),
                label: "起始编号".to_string(),
                param_type: ParamType::Number,
                required: false,
                default: Some(Value::Number(1.into())),
                description: Some("输入起始编号".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["numbering".to_string()],
                }),
            },
            ParamDefinition {
                name: "digits".to_string(),
                label: "编号位数".to_string(),
                param_type: ParamType::Number,
                required: false,
                default: Some(Value::Number(3.into())),
                description: Some("输入编号位数（如 3 表示 001, 002...）".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["numbering".to_string()],
                }),
            },
            ParamDefinition {
                name: "separator".to_string(),
                label: "分隔符".to_string(),
                param_type: ParamType::Text,
                required: false,
                default: Some(Value::String("_".to_string())),
                description: Some("输入文件名和编号之间的分隔符".to_string()),
                show_when: Some(DisplayCondition {
                    param: "mode".to_string(),
                    values: vec!["numbering".to_string()],
                }),
            },
        ]
    }

    fn execute(&self, params: Value, _ctx: &ScriptContext) -> Result<ScriptResult, AppError> {
        // 获取目标目录
        let directory_str = params["directory"].as_str().ok_or_else(|| {
            AppError::ValidationError("请选择目标目录".to_string())
        })?;
        let directory = Path::new(directory_str);

        // 验证目录存在
        if !directory.exists() {
            return Err(AppError::ValidationError(format!(
                "目录不存在: {}",
                directory_str
            )));
        }
        if !directory.is_dir() {
            return Err(AppError::ValidationError(format!(
                "路径不是目录: {}",
                directory_str
            )));
        }

        // 获取重命名模式
        let mode_str = params["mode"].as_str().unwrap_or("add_prefix");
        let mode = RenameMode::from_str(mode_str).ok_or_else(|| {
            AppError::ValidationError(format!("无效的重命名模式: {}", mode_str))
        })?;

        // 执行重命名
        let (success_count, fail_count) = self.execute_rename(directory, mode, &params)?;

        // 构建输出消息
        let output = format!(
            "文件重命名完成！成功: {} 个，失败: {} 个",
            success_count, fail_count
        );

        if fail_count > 0 {
            Ok(ScriptResult {
                success: success_count > 0,
                output,
                error: Some(format!("{} 个文件重命名失败", fail_count)),
            })
        } else {
            Ok(ScriptResult::success(output))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_script_info() {
        let script = FileRenameScript::new();
        assert_eq!(script.id(), "file_rename");
        assert_eq!(script.name(), "文件批量重命名");
        assert!(!script.description().is_empty());
    }

    #[test]
    fn test_params_schema() {
        let script = FileRenameScript::new();
        let params = script.params_schema();
        assert!(!params.is_empty());

        // 检查必填参数
        let directory_param = params.iter().find(|p| p.name == "directory");
        assert!(directory_param.is_some());
        assert!(directory_param.unwrap().required);
    }

    #[test]
    fn test_add_prefix() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        // 创建测试文件
        fs::File::create(dir.path().join("test1.txt")).unwrap();
        fs::File::create(dir.path().join("test2.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_prefix",
            "prefix": "new_"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx).unwrap();

        assert!(result.success);
        assert!(fs::exists(dir.path().join("new_test1.txt")).unwrap());
        assert!(fs::exists(dir.path().join("new_test2.txt")).unwrap());
    }

    #[test]
    fn test_add_suffix() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        // 创建测试文件
        fs::File::create(dir.path().join("test1.txt")).unwrap();
        fs::File::create(dir.path().join("test2.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_suffix",
            "suffix": "_backup"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx).unwrap();

        assert!(result.success);
        assert!(fs::exists(dir.path().join("test1_backup.txt")).unwrap());
        assert!(fs::exists(dir.path().join("test2_backup.txt")).unwrap());
    }

    #[test]
    fn test_replace_text() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        // 创建测试文件
        fs::File::create(dir.path().join("old_file1.txt")).unwrap();
        fs::File::create(dir.path().join("old_file2.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "replace",
            "old_text": "old",
            "new_text": "new"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx).unwrap();

        assert!(result.success);
        assert!(fs::exists(dir.path().join("new_file1.txt")).unwrap());
        assert!(fs::exists(dir.path().join("new_file2.txt")).unwrap());
    }

    #[test]
    fn test_numbering() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        // 创建测试文件
        fs::File::create(dir.path().join("photo.jpg")).unwrap();
        fs::File::create(dir.path().join("photo.jpg")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "numbering",
            "start_number": 1,
            "digits": 3,
            "separator": "_"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        // 即使只有一个文件也应该成功
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_directory() {
        let script = FileRenameScript::new();
        let params = serde_json::json!({
            "directory": "/non/existent/directory",
            "mode": "add_prefix",
            "prefix": "test_"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::ValidationError(_))));
    }

    #[test]
    fn test_empty_prefix() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        fs::File::create(dir.path().join("test.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_prefix",
            "prefix": ""
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        assert!(result.is_err());
    }

    #[test]
    fn test_empty_suffix() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        fs::File::create(dir.path().join("test.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_suffix",
            "suffix": ""
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        assert!(result.is_err());
    }

    #[test]
    fn test_empty_old_text() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        fs::File::create(dir.path().join("test.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "replace",
            "old_text": "",
            "new_text": "new"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_mode() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        fs::File::create(dir.path().join("test.txt")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "invalid_mode"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx);

        assert!(result.is_err());
    }

    #[test]
    fn test_file_without_extension() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        // 创建无扩展名的文件
        fs::File::create(dir.path().join("README")).unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_suffix",
            "suffix": "_backup"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx).unwrap();

        assert!(result.success);
        assert!(fs::exists(dir.path().join("README_backup")).unwrap());
    }

    #[test]
    fn test_empty_directory() {
        let script = FileRenameScript::new();
        let dir = tempdir().unwrap();

        let params = serde_json::json!({
            "directory": dir.path().to_str().unwrap(),
            "mode": "add_prefix",
            "prefix": "test_"
        });

        let ctx = ScriptContext::default();
        let result = script.execute(params, &ctx).unwrap();

        // 空目录应该成功（0 个文件被重命名）
        assert!(result.success);
    }
}
