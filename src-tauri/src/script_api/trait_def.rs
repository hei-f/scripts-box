//! Script trait 定义
//!
//! 所有脚本必须实现此 trait，定义脚本的元信息和执行逻辑

use serde_json::Value;

use crate::error::AppError;

use super::{OutputDefinition, ParamDefinition, ScriptContext, ScriptResult};

/// 脚本 trait
///
/// 所有脚本必须实现此 trait，定义脚本的元信息和执行逻辑
pub trait Script: Send + Sync {
    /// 获取脚本唯一标识
    ///
    /// ID 用于在注册中心查找脚本，必须全局唯一
    fn id(&self) -> &str;

    /// 获取脚本显示名称
    ///
    /// 用于在前端界面显示
    fn name(&self) -> &str;

    /// 获取脚本描述
    ///
    /// 用于在前端界面显示脚本用途说明
    fn description(&self) -> &str;

    /// 获取参数定义列表
    ///
    /// 返回脚本需要的参数定义，前端据此生成动态表单
    fn params_schema(&self) -> Vec<ParamDefinition>;

    /// 获取输出字段定义列表
    ///
    /// 返回脚本的结构化输出字段定义，用于工作流节点间的参数传递
    /// 默认返回空列表，表示脚本不提供结构化输出
    fn output_schema(&self) -> Vec<OutputDefinition> {
        vec![]
    }

    /// 执行脚本
    ///
    /// # 参数
    /// - `params`: JSON 格式的参数值，键名对应 ParamDefinition 的 name 字段
    /// - `ctx`: 执行上下文，提供环境信息和资源路径
    ///
    /// # 返回
    /// 执行结果，包含成功状态、输出内容和错误信息
    fn execute(&self, params: Value, ctx: &ScriptContext) -> Result<ScriptResult, AppError>;
}