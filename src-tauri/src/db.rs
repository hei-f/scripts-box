//! SQLite 数据库模块
//!
//! 提供执行历史的持久化存储功能

use crate::error::AppError;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 数据库文件名常量
const DATABASE_FILE: &str = "scripts_box.db";

/// 执行状态常量
const STATUS_SUCCESS: &str = "success";
const STATUS_FAILURE: &str = "failure";

/// 执行历史记录
///
/// 存储脚本的执行历史，包括参数、输出、错误信息等
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    /// 记录 ID（数据库自动生成）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    /// 脚本 ID
    pub script_id: String,
    /// 执行参数（JSON 序列化）
    pub params: String,
    /// 执行状态：success / failure
    pub status: String,
    /// 输出内容
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    /// 错误信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// 执行时间（Unix 时间戳，毫秒）
    pub executed_at: i64,
    /// 执行时长（毫秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
}

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
        "#;

        self.conn
            .execute_batch(sql)
            .map_err(|e| AppError::DatabaseError(format!("创建表失败: {}", e)))?;

        Ok(())
    }

    /// 插入执行记录
    ///
    /// # 参数
    /// - `record`: 执行记录
    ///
    /// # 返回
    /// 成功返回新记录的 ID，失败返回 AppError
    pub fn insert_history(&self, record: ExecutionRecord) -> Result<i64, AppError> {
        let sql = r#"
            INSERT INTO execution_history (script_id, params, status, output, error, executed_at, duration_ms)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#;

        self.conn
            .execute(
                sql,
                params![
                    record.script_id,
                    record.params,
                    record.status,
                    record.output,
                    record.error,
                    record.executed_at,
                    record.duration_ms,
                ],
            )
            .map_err(|e| AppError::DatabaseError(format!("插入记录失败: {}", e)))?;

        Ok(self.conn.last_insert_rowid())
    }

    /// 查询执行历史
    ///
    /// # 参数
    /// - `script_id`: 可选的脚本 ID 过滤条件
    /// - `limit`: 返回记录数量限制
    ///
    /// # 返回
    /// 成功返回执行记录列表，失败返回 AppError
    pub fn list_history(
        &self,
        script_id: Option<&str>,
        limit: i64,
    ) -> Result<Vec<ExecutionRecord>, AppError> {
        let sql = match script_id {
            Some(_) => r#"
                SELECT id, script_id, params, status, output, error, executed_at, duration_ms
                FROM execution_history
                WHERE script_id = ?1
                ORDER BY executed_at DESC
                LIMIT ?2
            "#,
            None => r#"
                SELECT id, script_id, params, status, output, error, executed_at, duration_ms
                FROM execution_history
                ORDER BY executed_at DESC
                LIMIT ?1
            "#,
        };

        let mut stmt = self
            .conn
            .prepare(sql)
            .map_err(|e| AppError::DatabaseError(format!("查询准备失败: {}", e)))?;

        let records = match script_id {
            Some(sid) => {
                stmt.query_map(params![sid, limit], |row| {
                    Ok(ExecutionRecord {
                        id: Some(row.get(0)?),
                        script_id: row.get(1)?,
                        params: row.get(2)?,
                        status: row.get(3)?,
                        output: row.get(4)?,
                        error: row.get(5)?,
                        executed_at: row.get(6)?,
                        duration_ms: row.get(7)?,
                    })
                })
                .map_err(|e| AppError::DatabaseError(format!("查询执行失败: {}", e)))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?
            }
            None => {
                stmt.query_map(params![limit], |row| {
                    Ok(ExecutionRecord {
                        id: Some(row.get(0)?),
                        script_id: row.get(1)?,
                        params: row.get(2)?,
                        status: row.get(3)?,
                        output: row.get(4)?,
                        error: row.get(5)?,
                        executed_at: row.get(6)?,
                        duration_ms: row.get(7)?,
                    })
                })
                .map_err(|e| AppError::DatabaseError(format!("查询执行失败: {}", e)))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?
            }
        };

        Ok(records)
    }

    /// 删除执行记录
    ///
    /// # 参数
    /// - `id`: 记录 ID
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn delete_history(&self, id: i64) -> Result<(), AppError> {
        let sql = "DELETE FROM execution_history WHERE id = ?1";

        let rows_affected = self
            .conn
            .execute(sql, params![id])
            .map_err(|e| AppError::DatabaseError(format!("删除记录失败: {}", e)))?;

        if rows_affected == 0 {
            return Err(AppError::NotFoundError(format!(
                "执行记录不存在: id={}",
                id
            )));
        }

        Ok(())
    }

    /// 清空执行历史
    ///
    /// # 参数
    /// - `script_id`: 可选的脚本 ID，如果提供则只清空该脚本的历史
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn clear_history(&self, script_id: Option<&str>) -> Result<(), AppError> {
        match script_id {
            Some(sid) => {
                let sql = "DELETE FROM execution_history WHERE script_id = ?1";
                self.conn
                    .execute(sql, params![sid])
                    .map_err(|e| AppError::DatabaseError(format!("清空历史失败: {}", e)))?;
            }
            None => {
                let sql = "DELETE FROM execution_history";
                self.conn
                    .execute(sql, [])
                    .map_err(|e| AppError::DatabaseError(format!("清空历史失败: {}", e)))?;
            }
        }

        Ok(())
    }
}

/// 创建成功状态的执行记录
///
/// # 参数
/// - `script_id`: 脚本 ID
/// - `params`: 执行参数（JSON 字符串）
/// - `output`: 输出内容
/// - `executed_at`: 执行时间（Unix 时间戳，毫秒）
/// - `duration_ms`: 执行时长（毫秒）
///
/// # 返回
/// 返回成功状态的 ExecutionRecord
#[allow(dead_code)]
pub fn create_success_record(
    script_id: String,
    params: String,
    output: String,
    executed_at: i64,
    duration_ms: i64,
) -> ExecutionRecord {
    ExecutionRecord {
        id: None,
        script_id,
        params,
        status: STATUS_SUCCESS.to_string(),
        output: Some(output),
        error: None,
        executed_at,
        duration_ms: Some(duration_ms),
    }
}

/// 创建失败状态的执行记录
///
/// # 参数
/// - `script_id`: 脚本 ID
/// - `params`: 执行参数（JSON 字符串）
/// - `error`: 错误信息
/// - `executed_at`: 执行时间（Unix 时间戳，毫秒）
/// - `duration_ms`: 执行时长（毫秒）
///
/// # 返回
/// 返回失败状态的 ExecutionRecord
#[allow(dead_code)]
pub fn create_failure_record(
    script_id: String,
    params: String,
    error: String,
    executed_at: i64,
    duration_ms: i64,
) -> ExecutionRecord {
    ExecutionRecord {
        id: None,
        script_id,
        params,
        status: STATUS_FAILURE.to_string(),
        output: None,
        error: Some(error),
        executed_at,
        duration_ms: Some(duration_ms),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_init() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path());
        assert!(db.is_ok());
    }

    #[test]
    fn test_insert_and_list_history() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        let record = create_success_record(
            "test_script".to_string(),
            r#"{"arg1": "value1"}"#.to_string(),
            "执行成功".to_string(),
            1000000,
            100,
        );

        let id = db.insert_history(record).expect("插入记录失败");
        assert!(id > 0);

        let records = db.list_history(None, 10).expect("查询记录失败");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].script_id, "test_script");
    }

    #[test]
    fn test_delete_history() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        let record = create_success_record(
            "test_script".to_string(),
            "{}".to_string(),
            "ok".to_string(),
            1000000,
            100,
        );

        let id = db.insert_history(record).expect("插入记录失败");
        db.delete_history(id).expect("删除记录失败");

        let records = db.list_history(None, 10).expect("查询记录失败");
        assert!(records.is_empty());
    }

    #[test]
    fn test_clear_history() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        // 插入多条记录
        for i in 0..3 {
            let record = create_success_record(
                if i % 2 == 0 { "script_a" } else { "script_b" }.to_string(),
                "{}".to_string(),
                "ok".to_string(),
                1000000 + i,
                100,
            );
            db.insert_history(record).expect("插入记录失败");
        }

        // 清空 script_a 的历史
        db.clear_history(Some("script_a")).expect("清空历史失败");

        let records = db.list_history(Some("script_a"), 10).expect("查询记录失败");
        assert!(records.is_empty());

        let records = db.list_history(Some("script_b"), 10).expect("查询记录失败");
        assert_eq!(records.len(), 1);
    }

    #[test]
    fn test_clear_all_history() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        // 插入多条记录
        for i in 0..5 {
            let record = create_success_record(
                format!("script_{}", i),
                "{}".to_string(),
                "ok".to_string(),
                1000000 + i,
                100,
            );
            db.insert_history(record).expect("插入记录失败");
        }

        // 清空所有历史
        db.clear_history(None).expect("清空历史失败");

        let records = db.list_history(None, 10).expect("查询记录失败");
        assert!(records.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_record() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        let result = db.delete_history(99999);
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::NotFoundError(_))));
    }

    #[test]
    fn test_list_history_with_limit() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        // 插入 5 条记录
        for i in 0..5 {
            let record = create_success_record(
                "test_script".to_string(),
                "{}".to_string(),
                format!("output_{}", i),
                1000000 + i,
                100,
            );
            db.insert_history(record).expect("插入记录失败");
        }

        // 限制返回 3 条
        let records = db.list_history(None, 3).expect("查询记录失败");
        assert_eq!(records.len(), 3);

        // 验证按时间倒序排列（最新的在前）
        assert_eq!(records[0].output, Some("output_4".to_string()));
        assert_eq!(records[2].output, Some("output_2".to_string()));
    }

    #[test]
    fn test_create_failure_record() {
        let record = create_failure_record(
            "test_script".to_string(),
            r#"{"arg": "value"}"#.to_string(),
            "执行失败".to_string(),
            1000000,
            50,
        );

        assert_eq!(record.script_id, "test_script");
        assert_eq!(record.status, STATUS_FAILURE);
        assert!(record.output.is_none());
        assert_eq!(record.error, Some("执行失败".to_string()));
    }

    #[test]
    fn test_insert_failure_record() {
        let dir = tempdir().expect("创建临时目录失败");
        let db = Database::init(dir.path()).expect("初始化数据库失败");

        let record = create_failure_record(
            "failing_script".to_string(),
            "{}".to_string(),
            "参数错误".to_string(),
            1000000,
            10,
        );

        let id = db.insert_history(record).expect("插入记录失败");
        assert!(id > 0);

        let records = db.list_history(None, 10).expect("查询记录失败");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].status, STATUS_FAILURE);
        assert!(records[0].output.is_none());
        assert_eq!(records[0].error, Some("参数错误".to_string()));
    }
}
