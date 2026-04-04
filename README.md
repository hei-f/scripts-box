# Scripts Box

跨平台工具箱应用，用于统一管理和执行自定义脚本。

## 技术栈

- **后端**: Rust + Tauri v2
- **前端**: React + TypeScript + Ant Design 6
- **数据存储**: SQLite + JSON 配置文件

## 项目结构

```
scripts-box/
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── builtin/    # 内置脚本实现
│   │   ├── commands/   # Tauri 命令
│   │   ├── config/     # 配置管理
│   │   ├── script_api/ # Script trait 定义
│   │   ├── db.rs       # 数据库操作
│   │   ├── registry.rs # 脚本注册中心
│   │   └── error.rs    # 错误类型定义
│   └── Cargo.toml
├── src/                # React 前端
│   ├── components/     # 通用组件
│   ├── pages/          # 页面组件
│   ├── services/       # Tauri 服务层
│   ├── types/          # TypeScript 类型
│   └── router/         # 路由配置
└── package.json
```

## 核心功能

1. **脚本管理**: 注册、配置、执行自定义脚本
2. **动态表单**: 根据脚本参数定义自动生成表单
3. **执行历史**: 记录和查询脚本执行历史
4. **配置同步**: JSON 配置文件与 UI 双向同步

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.88+ (推荐使用 rustup 安装)
- Bun (包管理器)

### 安装依赖

```bash
# 安装前端依赖
bun install

# Rust 依赖会在首次构建时自动安装
```

### 开发模式

```bash
bun run tauri dev
```

### 构建生产版本

```bash
bun run tauri build
```

## 扩展脚本

### 添加内置脚本

1. 在 `src-tauri/src/builtin/` 创建新脚本文件
2. 实现 `Script` trait
3. 在 `src-tauri/src/builtin/mod.rs` 注册脚本

### Script Trait 接口

```rust
pub trait Script: Send + Sync {
    fn id(&self) -> &str;                              // 脚本唯一标识
    fn name(&self) -> &str;                            // 显示名称
    fn description(&self) -> &str;                     // 描述说明
    fn params_schema(&self) -> Vec<ParamDefinition>;  // 参数定义
    fn execute(&self, params: Value, ctx: &ScriptContext) -> Result<ScriptResult, AppError>;
}
```

## 配置文件

脚本配置存储在应用配置目录的 `scripts.json` 文件中：

- macOS: `~/Library/Application Support/com.lyj.scripts-box/`
- Windows: `%APPDATA%\com.lyj.scripts-box\`
- Linux: `~/.config/com.lyj.scripts-box/`

## 许可证

MIT
