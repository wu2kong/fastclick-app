use std::path::PathBuf;
use std::fs;

use crate::models::AppInfo;
use crate::config::get_icons_dir;

#[tauri::command]
pub async fn extract_app_info(app_path: String) -> Result<AppInfo, String> {
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
    let icons_dir = get_icons_dir();

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
pub async fn save_app_icon(icon_data: String, action_id: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};

    let icons_dir = get_icons_dir();

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