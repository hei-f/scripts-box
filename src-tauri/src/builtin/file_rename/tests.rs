//! 文件批量重命名脚本单元测试

use super::*;
use crate::script_api::{Script, ScriptContext};
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
    assert!(matches!(
        result,
        Err(crate::error::AppError::ValidationError(_))
    ));
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
