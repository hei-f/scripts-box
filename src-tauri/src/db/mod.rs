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
use rusqlite::{params, Connection};
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
                updated_at INTEGER NOT NULL,
                node_count INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
            CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);
        "#;

        self.conn
            .execute_batch(sql)
            .map_err(|e| AppError::DatabaseError(format!("创建表失败: {}", e)))?;

        // 数据库迁移：为已存在的 workflows 表添加 node_count 列
        self.migrate_add_node_count()?;

        // 插入初始化工作流
        self.insert_initial_workflows()?;

        Ok(())
    }

    /// 数据库迁移：为 workflows 表添加 node_count 列
    fn migrate_add_node_count(&self) -> Result<(), AppError> {
        // 检查 node_count 列是否已存在
        let column_exists: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('workflows') WHERE name='node_count'",
                [],
                |row| row.get::<_, i32>(0),
            )
            .unwrap_or(0)
            > 0;

        if !column_exists {
            self.conn
                .execute(
                    "ALTER TABLE workflows ADD COLUMN node_count INTEGER DEFAULT 0",
                    [],
                )
                .map_err(|e| AppError::DatabaseError(format!("添加 node_count 列失败: {}", e)))?;

            // 更新已有工作流的 node_count：从 definition JSON 中计算节点数量
            self.update_existing_workflow_node_counts()?;
        }

        Ok(())
    }

    /// 更新已有工作流的 node_count 值
    ///
    /// 从 definition JSON 中解析 nodes 数组并更新 node_count
    fn update_existing_workflow_node_counts(&self) -> Result<(), AppError> {
        // 获取所有工作流的 id 和 definition
        let workflows: Vec<(String, String)> = self
            .conn
            .prepare("SELECT id, definition FROM workflows")
            .map_err(|e| AppError::DatabaseError(format!("准备查询失败: {}", e)))?
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| AppError::DatabaseError(format!("查询工作流失败: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("收集结果失败: {}", e)))?;

        // 更新每个工作流的 node_count
        for (id, definition) in workflows {
            // 从 JSON 中计算节点数量
            let node_count = self.calculate_node_count_from_definition(&definition);
            self.conn
                .execute(
                    "UPDATE workflows SET node_count = ?1 WHERE id = ?2",
                    params![node_count, id],
                )
                .map_err(|e| AppError::DatabaseError(format!("更新 node_count 失败: {}", e)))?;
        }

        Ok(())
    }

    /// 从 definition JSON 中计算节点数量
    fn calculate_node_count_from_definition(&self, definition: &str) -> i32 {
        // 尝试解析 JSON 并计算 nodes 数组长度
        serde_json::from_str::<serde_json::Value>(definition)
            .ok()
            .and_then(|json| json.get("nodes")?.as_array().map(|arr| arr.len() as i32))
            .unwrap_or(0)
    }
}
