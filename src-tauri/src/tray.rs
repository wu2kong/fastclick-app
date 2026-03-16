use std::sync::Mutex;
use std::sync::atomic::Ordering;
use tauri::{Emitter, Manager, tray::TrayIconBuilder, menu::{Menu, Submenu, MenuItem, PredefinedMenuItem, IsMenuItem}};

use crate::models::AppState;
use crate::config;
use crate::executor::execute_action_by_id;

#[tauri::command]
pub fn refresh_tray_menu(app: tauri::AppHandle) -> Result<(), String> {
    rebuild_tray_menu(&app)?;
    Ok(())
}

#[tauri::command]
pub fn set_minimize_to_tray(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let state = app.state::<Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    state_guard.minimize_to_tray.store(enabled, Ordering::SeqCst);
    eprintln!("[Tray] Set minimizeToTray to {}", enabled);
    Ok(())
}

fn rebuild_tray_menu(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    if let Some(tray) = &state_guard.tray {
        let menu = build_tray_menu(app)?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

fn build_tray_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, String> {
    let categories = config::load_categories();
    let actions = config::load_actions();
    
    let show_window = MenuItem::with_id(app, "show-window", "打开界面", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    
    let separator1 = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    
    let mut category_submenus: Vec<Submenu<tauri::Wry>> = Vec::new();
    
    for category in &categories {
        let category_actions: Vec<&crate::models::ClickAction> = actions
            .iter()
            .filter(|a| a.category_id == category.id)
            .collect();
        
        if category_actions.is_empty() {
            continue;
        }
        
        let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();
        
        for action in category_actions {
            let item = MenuItem::with_id(
                app,
                &format!("action:{}", action.id),
                &action.name,
                true,
                None::<&str>,
            ).map_err(|e| e.to_string())?;
            items.push(item);
        }
        
        let submenu = Submenu::with_items(
            app,
            &category.name,
            true,
            &items.iter().map(|i| i as &dyn IsMenuItem<tauri::Wry>).collect::<Vec<_>>(),
        ).map_err(|e| e.to_string())?;
        
        category_submenus.push(submenu);
    }
    
    let separator2 = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    
    let mut menu_items: Vec<&dyn IsMenuItem<tauri::Wry>> = Vec::new();
    menu_items.push(&show_window);
    menu_items.push(&separator1);
    
    for submenu in &category_submenus {
        menu_items.push(submenu);
    }
    
    menu_items.push(&separator2);
    menu_items.push(&settings_item);
    menu_items.push(&quit_item);
    
    Menu::with_items(app, &menu_items).map_err(|e| e.to_string())
}

pub fn create_tray(app: &tauri::AppHandle) -> Result<tauri::tray::TrayIcon, String> {
    let tray_menu = build_tray_menu(app)?;
    
    let icon_bytes = include_bytes!("../icons/64x64.png");
    let img = image::load_from_memory(icon_bytes)
        .map_err(|e| format!("加载托盘图标失败: {:?}", e))?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let icon = tauri::image::Image::new_owned(rgba.into_raw(), width, height);
    
    let tray = TrayIconBuilder::new()
        .tooltip("ClickPad")
        .icon(icon)
        .menu(&tray_menu)
        .on_menu_event(|app, event| {
            let id = event.id.0.as_str().to_string();
            
            match id.as_str() {
                "show-window" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    let _ = app.emit("menu-settings-click", ());
                }
                "quit" => {
                    app.exit(0);
                }
                id_str if id_str.starts_with("action:") => {
                    let action_id = id_str.strip_prefix("action:").unwrap().to_string();
                    let app_handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let result = execute_action_by_id(&app_handle, &action_id).await;
                        if let Err(e) = result {
                            eprintln!("执行动作失败: {}", e);
                        }
                    });
                }
                _ => {}
            }
        })
        .build(app).map_err(|e| e.to_string())?;
    
    Ok(tray)
}