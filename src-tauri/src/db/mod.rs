//! SQLite 数据库模块
//!
//! 提供执行历史、错误日志和工作流的持久化存储功能

mod error_logs;
mod history;
mod initial_data;
mod types;
mod workflow_store;

#[cfg(test)]
mod tests;

use crate::error::AppError;
use rusqlite::Connection;
use std::path::Path;

// 重导出公共类型
pub use types::{create_failure_record, create_success_record, ErrorLog, ExecutionRecord};

/// 数据库文件名常量
const DATABASE_FILE: &str = "scripts_box.db";

/// 数据库结构体
///
/// 封装 SQLite 连接，提供执行历史的 CRUD 操作
pub struct Database {
    conn: Connection,
}

impl Database {
    /// 初始化数据库
    ///
    /// # 参数
    /// - `path`: 数据库文件所在目录路径
    ///
    /// # 返回
    /// 成功返回 Database 实例，失败返回 AppError
    ///
    /// # 示例
    /// ```ignore
    /// let db = Database::init(Path::new("./data"))?;
    /// ```
    pub fn init(path: &Path) -> Result<Self, AppError> {
        // 确保目录存在
        std::fs::create_dir_all(path)?;

        // 构建数据库文件路径
        let db_path = path.join(DATABASE_FILE);

        // 打开或创建数据库连接
        let conn = Connection::open(&db_path)
            .map_err(|e| AppError::DatabaseError(format!("无法打开数据库: {}", e)))?;

        // 创建执行历史表
        let db = Database { conn };
        db.create_tables()?;

        Ok(db)
    }

    /// 创建数据库表
    fn create_tables(&self) -> Result<(), AppError> {
        let sql = r#"
            CREATE TABLE IF NOT EXISTS execution_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id TEXT NOT NULL,
                params TEXT NOT NULL,
                status TEXT NOT NULL,
                output TEXT,
                error TEXT,
                executed_at INTEGER NOT NULL,
                duration_ms INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_script_id ON execution_history(script_id);
            CREATE INDEX IF NOT EXISTS idx_executed_at ON execution_history(executed_at);

            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                error_type TEXT NOT NULL,
                message TEXT NOT NULL,
                stack_trace TEXT,
                context TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                definition TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
            CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);
        "#;

        self.conn
            .execute_batch(sql)
            .map_err(|e| AppError::DatabaseError(format!("创建表失败: {}", e)))?;

        // 插入初始化工作流
        self.insert_initial_workflows()?;

        Ok(())
    }
}
