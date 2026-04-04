#!/bin/bash
# 脚本测试工具
#
# 用法:
#   ./test-script.sh                    # 列出所有脚本
#   ./test-script.sh add_numbers        # 测试加法脚本
#   ./test-script.sh add_numbers 10 20  # 使用指定参数测试加法脚本

set -e

cd "$(dirname "$0")"

export PATH="/opt/homebrew/opt/rustup/bin:$PATH"

if [ -z "$1" ]; then
    echo "运行所有集成测试..."
    cargo test --manifest-path src-tauri/Cargo.toml --test integration_test -- --nocapture
elif [ "$1" = "add_numbers" ] && [ -n "$2" ] && [ -n "$3" ]; then
    echo "测试加法脚本: $2 + $3"
    ADD_NUMBERS_A="$2" ADD_NUMBERS_B="$3" cargo test --manifest-path src-tauri/Cargo.toml --test integration_test test_execute_add_numbers -- --nocapture
elif [ "$1" = "add_numbers" ]; then
    echo "测试加法脚本（默认参数）..."
    cargo test --manifest-path src-tauri/Cargo.toml --test integration_test test_execute_add_numbers -- --nocapture
elif [ "$1" = "batch" ]; then
    echo "批量测试加法脚本..."
    cargo test --manifest-path src-tauri/Cargo.toml --test integration_test test_add_numbers_batch -- --nocapture
else
    echo "运行测试: $1"
    cargo test --manifest-path src-tauri/Cargo.toml --test integration_test "$1" -- --nocapture
fi