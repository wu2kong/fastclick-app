// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResult {
    success: bool,
    message: String,
    output: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptParams {
    args: Option<Vec<String>>,
    env: Option<Vec<(String, String)>>,
    working_dir: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    name: String,
    icon_path: Option<String>,
    app_path: String,
}

#[tauri::command]
async fn execute_action(
    action_type: String,
    action_value: String,
    params: Option<ScriptParams>,
    app: tauri::AppHandle,
) -> Result<ExecuteResult, String> {
    match action_type.as_str() {
        "open_app" => execute_open_app(&action_value, &app).await,
        "execute_script" => execute_script(&action_value, params, &app).await,
        _ => Err(format!("未知操作类型: {}", action_type)),
    }
}

async fn execute_open_app(path: &str, app: &tauri::AppHandle) -> Result<ExecuteResult, String> {
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

async fn execute_script(
    script: &str,
    params: Option<ScriptParams>,
    app: &tauri::AppHandle,
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

#[tauri::command]
async fn extract_app_info(app_path: String) -> Result<AppInfo, String> {
    #[cfg(target_os = "macos")]
    {
        extract_macos_app_info(app_path)
    }

    #[cfg(target_os = "windows")]
    {
        let name = PathBuf::from(&app_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown App")
            .to_string();
        
        let icon_path = extract_windows_icon(&app_path)?;
        
        Ok(AppInfo {
            name,
            icon_path,
            app_path: app_path.clone(),
        })
    }

    #[cfg(target_os = "linux")]
    {
        Ok(AppInfo {
            name: PathBuf::from(&app_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown App")
                .to_string(),
            icon_path: None,
            app_path: app_path.clone(),
        })
    }
}

#[cfg(target_os = "macos")]
fn extract_macos_app_info(app_path: String) -> Result<AppInfo, String> {
    let plist_path = PathBuf::from(&app_path)
        .join("Contents")
        .join("Info.plist");

    let plist_value = plist::Value::from_file(&plist_path)
        .map_err(|e| format!("读取 Info.plist 失败: {}", e))?;

    let name = plist_value
        .as_dictionary()
        .and_then(|dict| dict.get("CFBundleDisplayName"))
        .or_else(|| plist_value.as_dictionary().and_then(|dict| dict.get("CFBundleName")))
        .or_else(|| plist_value.as_dictionary().and_then(|dict| dict.get("CFBundleExecutable")))
        .and_then(|v| v.as_string())
        .unwrap_or("Unknown App")
        .to_string();

    let icon_file = plist_value
        .as_dictionary()
        .and_then(|dict| dict.get("CFBundleIconFile"))
        .and_then(|v| v.as_string())
        .unwrap_or("AppIcon");

    let icon_path = find_and_extract_icon(&app_path, icon_file)?;

    Ok(AppInfo {
        name,
        icon_path,
        app_path: app_path.clone(),
    })
}

#[cfg(target_os = "macos")]
fn find_and_extract_icon(app_path: &str, icon_name: &str) -> Result<Option<String>, String> {
    let resources_path = PathBuf::from(app_path)
        .join("Contents")
        .join("Resources");

    let possible_icon_names = vec![
        icon_name.to_string(),
        format!("{}.icns", icon_name),
        "AppIcon.icns".to_string(),
        "app.icns".to_string(),
    ];

    for name in possible_icon_names {
        let icon_path = resources_path.join(&name);
        if icon_path.exists() {
            if let Ok(icon_data) = fs::read(&icon_path) {
                if let Ok(Some(saved_path)) = save_icon_to_file(&icon_data, app_path) {
                    return Ok(Some(saved_path));
                }
            }
        }
    }

    Ok(None)
}

#[cfg(target_os = "macos")]
fn save_icon_to_file(icon_data: &[u8], app_path: &str) -> Result<Option<String>, String> {
    let icons_dir = dirs::home_dir()
        .ok_or("无法获取主目录")?
        .join(".fastclick")
        .join("app-icons");

    fs::create_dir_all(&icons_dir).map_err(|e| format!("创建图标目录失败: {}", e))?;

    let app_name = PathBuf::from(app_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    let png_path = icons_dir.join(format!("{}.png", app_name));

    let icon_family = icns::IconFamily::read(std::io::Cursor::new(icon_data))
        .map_err(|e| format!("解析icns失败: {}", e))?;

    for icon_type in [
        icns::IconType::RGBA32_512x512,
        icns::IconType::RGBA32_256x256,
        icns::IconType::RGBA32_128x128,
        icns::IconType::RGBA32_64x64,
        icns::IconType::RGBA32_32x32,
    ] {
        if let Ok(icon) = icon_family.get_icon_with_type(icon_type) {
            let width = icon.width();
            let height = icon.height();
            let pixel_data = icon.data();
            
            let mut img = image::RgbaImage::from_raw(width, height, pixel_data.to_vec())
                .ok_or("创建图像失败")?;
            
            if width > 128 || height > 128 {
                img = image::imageops::resize(&img, 128, 128, image::imageops::FilterType::Lanczos3);
            }
            
            img.save(&png_path)
                .map_err(|e| format!("保存图标失败: {}", e))?;
            
            return Ok(Some(png_path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[cfg(target_os = "windows")]
fn extract_windows_icon(_app_path: &str) -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
async fn save_app_icon(icon_data: String, action_id: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};

    let icons_dir = dirs::home_dir()
        .ok_or("无法获取主目录")?
        .join(".fastclick")
        .join("app-icons");

    fs::create_dir_all(&icons_dir).map_err(|e| format!("创建图标目录失败: {}", e))?;

    let png_path = icons_dir.join(format!("{}.png", action_id));

    let decoded = general_purpose::STANDARD
        .decode(&icon_data)
        .map_err(|e| format!("解码图标数据失败: {}", e))?;

    let img = image::load_from_memory(&decoded)
        .map_err(|e| format!("加载图标失败: {}", e))?;

    let resized = img.resize(128, 128, image::imageops::FilterType::Lanczos3);

    resized
        .save(&png_path)
        .map_err(|e| format!("保存图标失败: {}", e))?;

    Ok(png_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            execute_action,
            extract_app_info,
            save_app_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}