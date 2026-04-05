#!/usr/bin/env cargo
//! 脚本测试 CLI 工具
//!
//! 用于在不启动 GUI 的情况下测试脚本执行
//!
//! 用法:
//!   cargo run --bin test_script -- <command> [args...]
//!
//! 示例:
//!   cargo run --bin test_script -- list
//!   cargo run --bin test_script -- run add_numbers '{"a": 10, "b": 20}'

use std::env;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }

    let command = &args[1];

    match command.as_str() {
        "list" => {
            // 使用 cargo test 来测试
            println!("请使用以下命令测试脚本:");
            println!();
            println!("  cargo test --manifest-path src-tauri/Cargo.toml add_numbers");
            println!();
            println!("或者在应用中手动测试。");
        }
        "run" => {
            if args.len() < 4 {
                eprintln!("用法: test_script run <script_id> <params_json>");
                eprintln!("示例: test_script run add_numbers '{{\"a\": 10, \"b\": 20}}'");
                process::exit(1);
            }
            let script_id = &args[2];
            let params_json = &args[3];

            println!("提示: 直接运行脚本需要 Tauri 环境。");
            println!("请使用以下测试命令代替:");
            println!();
            println!(
                "  cargo test --manifest-path src-tauri/Cargo.toml {}",
                script_id
            );
            println!();
            println!("参数 JSON: {}", params_json);
        }
        _ => {
            eprintln!("未知命令: {}", command);
            print_usage();
            process::exit(1);
        }
    }
}

fn print_usage() {
    println!("脚本测试 CLI 工具");
    println!();
    println!("用法:");
    println!("  test_script list                    显示测试说明");
    println!("  test_script run <id> <json>         显示测试命令");
    println!();
    println!("实际测试命令:");
    println!("  cargo test --manifest-path src-tauri/Cargo.toml <script_id>");
}
