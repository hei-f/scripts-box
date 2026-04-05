//! 执行历史 CRUD 操作

use rusqlite::params;

use crate::error::AppError;

use super::types::ExecutionRecord;

impl super::Database {
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
            Some(_) => {
                r#"
                SELECT id, script_id, params, status, output, error, executed_at, duration_ms
                FROM execution_history
                WHERE script_id = ?1
                ORDER BY executed_at DESC
                LIMIT ?2
            "#
            }
            None => {
                r#"
                SELECT id, script_id, params, status, output, error, executed_at, duration_ms
                FROM execution_history
                ORDER BY executed_at DESC
                LIMIT ?1
            "#
            }
        };

        let mut stmt = self
            .conn
            .prepare(sql)
            .map_err(|e| AppError::DatabaseError(format!("查询准备失败: {}", e)))?;

        let records = match script_id {
            Some(sid) => stmt
                .query_map(params![sid, limit], |row| {
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
                .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?,
            None => stmt
                .query_map(params![limit], |row| {
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
                .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?,
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
