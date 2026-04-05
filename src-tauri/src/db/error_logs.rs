//! 错误日志 CRUD 操作

use rusqlite::params;

use crate::error::AppError;

use super::types::ErrorLog;

impl super::Database {
    /// 插入错误日志
    ///
    /// # 参数
    /// - `log`: 错误日志记录
    ///
    /// # 返回
    /// 成功返回新记录的 ID，失败返回 AppError
    pub fn insert_error_log(&self, log: ErrorLog) -> Result<i64, AppError> {
        let sql = r#"
            INSERT INTO error_logs (source, error_type, message, stack_trace, context, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#;

        self.conn
            .execute(
                sql,
                params![
                    log.source,
                    log.error_type,
                    log.message,
                    log.stack_trace,
                    log.context,
                    log.created_at,
                ],
            )
            .map_err(|e| AppError::DatabaseError(format!("插入错误日志失败: {}", e)))?;

        Ok(self.conn.last_insert_rowid())
    }

    /// 查询错误日志
    ///
    /// # 参数
    /// - `limit`: 返回记录数量限制
    ///
    /// # 返回
    /// 成功返回错误日志列表，失败返回 AppError
    pub fn list_error_logs(&self, limit: i64) -> Result<Vec<ErrorLog>, AppError> {
        let sql = r#"
            SELECT id, source, error_type, message, stack_trace, context, created_at
            FROM error_logs
            ORDER BY created_at DESC
            LIMIT ?1
        "#;

        let mut stmt = self
            .conn
            .prepare(sql)
            .map_err(|e| AppError::DatabaseError(format!("查询准备失败: {}", e)))?;

        let logs = stmt
            .query_map(params![limit], |row| {
                Ok(ErrorLog {
                    id: Some(row.get(0)?),
                    source: row.get(1)?,
                    error_type: row.get(2)?,
                    message: row.get(3)?,
                    stack_trace: row.get(4)?,
                    context: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("查询执行失败: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?;

        Ok(logs)
    }

    /// 清空错误日志
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn clear_error_logs(&self) -> Result<(), AppError> {
        let sql = "DELETE FROM error_logs";
        self.conn
            .execute(sql, [])
            .map_err(|e| AppError::DatabaseError(format!("清空错误日志失败: {}", e)))?;

        Ok(())
    }

    /// 清理过期的错误日志
    ///
    /// # 参数
    /// - `days_to_keep`: 保留天数
    ///
    /// # 返回
    /// 成功返回删除的记录数，失败返回 AppError
    pub fn cleanup_old_error_logs(&self, days_to_keep: i64) -> Result<usize, AppError> {
        let cutoff_time =
            chrono::Utc::now().timestamp_millis() - days_to_keep * 24 * 60 * 60 * 1000;
        let sql = "DELETE FROM error_logs WHERE created_at < ?1";

        let rows_affected = self
            .conn
            .execute(sql, params![cutoff_time])
            .map_err(|e| AppError::DatabaseError(format!("清理过期日志失败: {}", e)))?;

        Ok(rows_affected)
    }
}
