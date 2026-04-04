//! 脚本执行集成测试
//!
//! 直接测试脚本执行逻辑，无需 Tauri GUI
//!
//! 运行方式:
//!   cargo test --manifest-path src-tauri/Cargo.toml --test integration_test -- --nocapture
//!
//! 执行特定脚本:
//!   ADD_NUMBERS_A=10 ADD_NUMBERS_B=20 cargo test --manifest-path src-tauri/Cargo.toml --test integration_test test_execute_add_numbers -- --nocapture

use scripts_box_lib::builtin::register_builtin_scripts;
use scripts_box_lib::registry::ScriptRegistry;
use scripts_box_lib::script_api::ScriptContext;
use std::env;

/// 创建并初始化脚本注册中心
fn create_registry() -> ScriptRegistry {
    let mut registry = ScriptRegistry::new();
    register_builtin_scripts(&mut registry);
    registry
}

/// 测试加法脚本执行
#[test]
fn test_execute_add_numbers() {
    let registry = create_registry();
    let script = registry.get("add_numbers").expect("脚本不存在");

    // 从环境变量获取参数，或使用默认值
    let a: f64 = env::var("ADD_NUMBERS_A")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10.0);
    let b: f64 = env::var("ADD_NUMBERS_B")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(20.0);

    let params = serde_json::json!({
        "a": a,
        "b": b
    });

    println!("执行脚本: {}", script.name());
    println!("参数: a={}, b={}", a, b);

    let ctx = ScriptContext::default();
    let result = script.execute(params, &ctx).expect("执行失败");

    println!("结果: {}", result.output);
    println!("成功: {}", result.success);

    assert!(result.success, "脚本执行应该成功");
    assert!(result.output.contains(&format!("{}", a + b)), "输出应包含正确结果");
}

/// 测试文件重命名脚本参数验证
#[test]
fn test_file_rename_params_validation() {
    let registry = create_registry();
    let script = registry.get("file_rename").expect("脚本不存在");

    // 测试无效参数（空目录）
    let params = serde_json::json!({
        "directory": "",
        "pattern": "test",
        "replacement": "new"
    });

    let ctx = ScriptContext::default();
    let result = script.execute(params, &ctx);

    // 应该返回错误（目录为空）
    assert!(result.is_err() || !result.unwrap().success);
}

/// 列出所有注册的脚本
#[test]
fn test_list_all_scripts() {
    let registry = create_registry();
    let scripts = registry.list();

    println!("\n已注册的脚本:");
    println!("{:<20} {:<30} {}", "ID", "名称", "描述");
    println!("{}", "-".repeat(80));
    for script in &scripts {
        println!("{:<20} {:<30} {}", script.id(), script.name(), script.description());
    }

    assert!(!scripts.is_empty(), "应该有注册的脚本");
}

/// 批量测试加法脚本
#[test]
fn test_add_numbers_batch() {
    let registry = create_registry();
    let script = registry.get("add_numbers").expect("脚本不存在");
    let ctx = ScriptContext::default();

    let test_cases = vec![
        (1.0, 2.0, 3.0),
        (10.5, 20.5, 31.0),
        (-5.0, 5.0, 0.0),
        (100.0, 200.0, 300.0),
        (0.0, 0.0, 0.0),
    ];

    println!("\n批量测试加法脚本:");
    println!("{:<10} {:<10} {:<10} {:<15}", "A", "B", "预期", "实际");
    println!("{}", "-".repeat(50));

    for (a, b, expected) in test_cases {
        let params = serde_json::json!({ "a": a, "b": b });
        let result = script.execute(params, &ctx).expect("执行失败");
        
        println!("{:<10} {:<10} {:<10} {}", a, b, expected, result.output);
        assert!(result.success, "脚本应该成功执行");
    }
}