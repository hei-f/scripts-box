//! 工作流持久化 CRUD 操作

use rusqlite::{params, OptionalExtension};

use crate::error::AppError;
use crate::workflow::types::{Workflow, WorkflowInfo};

impl super::Database {
    /// 插入工作流
    ///
    /// # 参数
    /// - `workflow`: 工作流定义
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn insert_workflow(&self, workflow: &Workflow) -> Result<(), AppError> {
        // 序列化工作流定义为 JSON
        let definition = serde_json::to_string(workflow)
            .map_err(|e| AppError::DatabaseError(format!("序列化工作流失败: {}", e)))?;

        // 获取当前时间戳
        let now = chrono::Utc::now().timestamp_millis();

        let sql = r#"
            INSERT INTO workflows (id, name, description, definition, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#;

        self.conn
            .execute(
                sql,
                params![
                    workflow.id,
                    workflow.name,
                    workflow.description,
                    definition,
                    now,
                    now,
                ],
            )
            .map_err(|e| AppError::DatabaseError(format!("插入工作流失败: {}", e)))?;

        Ok(())
    }

    /// 查询工作流
    ///
    /// # 参数
    /// - `id`: 工作流 ID
    ///
    /// # 返回
    /// 成功返回工作流定义（如果存在），失败返回 AppError
    pub fn get_workflow(&self, id: &str) -> Result<Option<Workflow>, AppError> {
        let sql = r#"
            SELECT definition
            FROM workflows
            WHERE id = ?1
        "#;

        let mut stmt = self
            .conn
            .prepare(sql)
            .map_err(|e| AppError::DatabaseError(format!("查询准备失败: {}", e)))?;

        let result = stmt
            .query_row(params![id], |row| row.get::<_, String>(0))
            .optional()
            .map_err(|e| AppError::DatabaseError(format!("查询执行失败: {}", e)))?;

        match result {
            Some(definition) => {
                let workflow: Workflow = serde_json::from_str(&definition)
                    .map_err(|e| AppError::DatabaseError(format!("解析工作流失败: {}", e)))?;
                Ok(Some(workflow))
            }
            None => Ok(None),
        }
    }

    /// 查询工作流列表
    ///
    /// # 返回
    /// 成功返回工作流基本信息列表，失败返回 AppError
    pub fn list_workflows(&self) -> Result<Vec<WorkflowInfo>, AppError> {
        let sql = r#"
            SELECT id, name, description, created_at, updated_at
            FROM workflows
            ORDER BY updated_at DESC
        "#;

        let mut stmt = self
            .conn
            .prepare(sql)
            .map_err(|e| AppError::DatabaseError(format!("查询准备失败: {}", e)))?;

        let workflows = stmt
            .query_map([], |row| {
                Ok(WorkflowInfo {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })
            .map_err(|e| AppError::DatabaseError(format!("查询执行失败: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::DatabaseError(format!("解析记录失败: {}", e)))?;

        Ok(workflows)
    }

    /// 更新工作流
    ///
    /// # 参数
    /// - `workflow`: 工作流定义
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn update_workflow(&self, workflow: &Workflow) -> Result<(), AppError> {
        // 序列化工作流定义为 JSON
        let definition = serde_json::to_string(workflow)
            .map_err(|e| AppError::DatabaseError(format!("序列化工作流失败: {}", e)))?;

        // 获取当前时间戳
        let now = chrono::Utc::now().timestamp_millis();

        let sql = r#"
            UPDATE workflows
            SET name = ?1, description = ?2, definition = ?3, updated_at = ?4
            WHERE id = ?5
        "#;

        let rows_affected = self
            .conn
            .execute(
                sql,
                params![
                    workflow.name,
                    workflow.description,
                    definition,
                    now,
                    workflow.id,
                ],
            )
            .map_err(|e| AppError::DatabaseError(format!("更新工作流失败: {}", e)))?;

        if rows_affected == 0 {
            return Err(AppError::NotFoundError(format!(
                "工作流不存在: id={}",
                workflow.id
            )));
        }

        Ok(())
    }

    /// 删除工作流
    ///
    /// # 参数
    /// - `id`: 工作流 ID
    ///
    /// # 返回
    /// 成功返回 ()，失败返回 AppError
    pub fn delete_workflow(&self, id: &str) -> Result<(), AppError> {
        let sql = "DELETE FROM workflows WHERE id = ?1";

        let rows_affected = self
            .conn
            .execute(sql, params![id])
            .map_err(|e| AppError::DatabaseError(format!("删除工作流失败: {}", e)))?;

        if rows_affected == 0 {
            return Err(AppError::NotFoundError(format!(
                "工作流不存在: id={}",
                id
            )));
        }

        Ok(())
    }
}
