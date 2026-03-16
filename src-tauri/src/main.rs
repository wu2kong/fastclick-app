#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod config;
mod executor;
mod app_info;
mod tray;

use std::sync::Mutex;
use std::sync::atomic::Ordering;
use tauri::{Manager, Emitter};
use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};

use models::AppState;

fn main() {
    let minimize_to_tray = config::load_settings();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Mutex::new(AppState {
            tray: None,
            minimize_to_tray: std::sync::atomic::AtomicBool::new(minimize_to_tray),
        }))
        .setup(|app| {
            setup_app_menu(app)?;
            setup_tray(app)?;
            setup_window_close_handler(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            executor::execute_action,
            app_info::extract_app_info,
            app_info::save_app_icon,
            tray::refresh_tray_menu,
            tray::set_minimize_to_tray,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "macos")]
fn setup_app_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let settings_item = MenuItem::with_id(app, "settings-menu", "设置...", true, None::<&str>)?;
    let app_menu = Submenu::with_items(
        app,
        "ClickPad",
        true,
        &[
            &PredefinedMenuItem::about(app, None, None)?,
            &PredefinedMenuItem::separator(app)?,
            &settings_item,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    
    let edit_menu = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    
    let view_menu = Submenu::with_items(
        app,
        "显示",
        true,
        &[
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;
    
    let window_menu = Submenu::with_items(
        app,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
        ],
    )?;
    
    let menu = Menu::with_items(app, &[&app_menu, &edit_menu, &view_menu, &window_menu])?;
    app.set_menu(menu)?;
    
    let app_handle = app.handle().clone();
    app.on_menu_event(move |_app, event| {
        if event.id.0.as_str() == "settings-menu" {
            let _ = app_handle.emit("menu-settings-click", ());
        }
    });
    
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn setup_app_menu(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let tray = tray::create_tray(app.handle())?;
    
    let state = app.state::<Mutex<AppState>>();
    let mut state_guard = state.lock().unwrap();
    state_guard.tray = Some(tray);
    
    Ok(())
}

fn setup_window_close_handler(app: &tauri::App) {
    let window = app.get_webview_window("main").unwrap();
    let app_handle = app.handle().clone();
    
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            let state = app_handle.state::<Mutex<AppState>>();
            let state_guard = state.lock().unwrap();
            let minimize_to_tray = state_guard.minimize_to_tray.load(Ordering::SeqCst);
            drop(state_guard);
            
            if minimize_to_tray {
                api.prevent_close();
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
        }
    });
}