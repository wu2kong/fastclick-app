use tauri_plugin_shell::ShellExt;
use tauri::AppHandle;

use crate::models::{ExecuteResult, ScriptParams};

pub async fn execute_action_by_id(app: &AppHandle, action_id: &str) -> Result<ExecuteResult, String> {
    let actions = crate::config::load_actions();
    let action = actions
        .iter()
        .find(|a| a.id == action_id)
        .ok_or_else(|| format!("未找到操作: {}", action_id))?;
    
    match action.action_data.action_type.as_str() {
        "open_app" => execute_open_app(&action.action_data.value, app).await,
        "execute_script" => {
            execute_script(
                &action.action_data.value,
                action.action_data.params.clone(),
                app,
            ).await
        }
        _ => Err(format!("未知操作类型: {}", action.action_data.action_type)),
    }
}

#[tauri::command]
pub async fn execute_action(
    action_type: String,
    action_value: String,
    params: Option<ScriptParams>,
    app: AppHandle,
) -> Result<ExecuteResult, String> {
    match action_type.as_str() {
        "open_app" => execute_open_app(&action_value, &app).await,
        "execute_script" => execute_script(&action_value, params, &app).await,
        _ => Err(format!("未知操作类型: {}", action_type)),
    }
}

pub async fn execute_open_app(path: &str, app: &AppHandle) -> Result<ExecuteResult, String> {
    #[cfg(target_os = "macos")]
    {
        let output = app
            .shell()
            .command("open")
            .args([path])
            .output()
            .await
            .map_err(|e| format!("打开应用失败: {}", e))?;

        if output.status.success() {
            Ok(ExecuteResult {
                success: true,
                message: "应用已打开".to_string(),
                output: None,
            })
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(target_os = "windows")]
    {
        let output = app
            .shell()
            .command("cmd")
            .args(["/C", "start", "", path])
            .output()
            .await
            .map_err(|e| format!("打开应用失败: {}", e))?;

        if output.status.success() {
            Ok(ExecuteResult {
                success: true,
                message: "应用已打开".to_string(),
                output: None,
            })
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = app
            .shell()
            .command("xdg-open")
            .args([path])
            .output()
            .await
            .map_err(|e| format!("打开应用失败: {}", e))?;

        if output.status.success() {
            Ok(ExecuteResult {
                success: true,
                message: "应用已打开".to_string(),
                output: None,
            })
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub async fn execute_script(
    script: &str,
    params: Option<ScriptParams>,
    app: &AppHandle,
) -> Result<ExecuteResult, String> {
    let params = params.unwrap_or(ScriptParams {
        args: None,
        env: None,
        working_dir: None,
        timeout_ms: None,
    });

    #[cfg(target_os = "windows")]
    let (shell, flag) = ("cmd", "/C");

    #[cfg(not(target_os = "windows"))]
    let (shell, flag) = ("sh", "-c");

    let mut cmd = app.shell().command(shell).args([flag, script]);

    if let Some(args) = &params.args {
        cmd = cmd.args(args);
    }

    if let Some(env_vars) = &params.env {
        for (key, value) in env_vars {
            cmd = cmd.env(key, value);
        }
    }

    if let Some(dir) = &params.working_dir {
        cmd = cmd.current_dir(dir);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("执行脚本失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(ExecuteResult {
            success: true,
            message: "脚本执行成功".to_string(),
            output: Some(stdout),
        })
    } else {
        Ok(ExecuteResult {
            success: false,
            message: "脚本执行失败".to_string(),
            output: Some(stderr),
        })
    }
}