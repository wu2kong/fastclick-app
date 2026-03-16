use std::fs;
use std::path::PathBuf;

use crate::models::{AppSettingsData, Category, ClickAction};

fn get_config_dir() -> PathBuf {
    dirs::home_dir().expect("无法获取主目录").join(".clickpad")
}

pub fn load_categories() -> Vec<Category> {
    let path = get_config_dir().join("app-cates.json");
    match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<Category>>(&content) {
            Ok(categories) => {
                eprintln!("[Config] Loaded {} categories", categories.len());
                categories
            }
            Err(e) => {
                eprintln!("[Config] Failed to parse categories: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            eprintln!("[Config] Failed to read categories file: {}", e);
            Vec::new()
        }
    }
}

pub fn load_actions() -> Vec<ClickAction> {
    let path = get_config_dir().join("app-user-data.json");
    match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
            Ok(data) => match data.get("clickActions") {
                Some(actions_value) => {
                    match serde_json::from_value::<Vec<ClickAction>>(actions_value.clone()) {
                        Ok(actions) => {
                            eprintln!("[Config] Loaded {} actions", actions.len());
                            actions
                        }
                        Err(e) => {
                            eprintln!("[Config] Failed to parse actions: {}", e);
                            Vec::new()
                        }
                    }
                }
                None => {
                    eprintln!("[Config] No clickActions in user data");
                    Vec::new()
                }
            },
            Err(e) => {
                eprintln!("[Config] Failed to parse user data: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            eprintln!("[Config] Failed to read user data file: {}", e);
            Vec::new()
        }
    }
}

pub fn load_settings() -> bool {
    let path = get_config_dir().join("settings.json");
    match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<AppSettingsData>(&content) {
            Ok(settings) => {
                eprintln!(
                    "[Config] minimizeToTray = {}",
                    settings.general.minimize_to_tray
                );
                settings.general.minimize_to_tray
            }
            Err(e) => {
                eprintln!("[Config] Failed to parse settings: {}", e);
                false
            }
        },
        Err(e) => {
            eprintln!("[Config] Failed to read settings file: {}", e);
            false
        }
    }
}

pub fn get_icons_dir() -> PathBuf {
    get_config_dir().join("app-icons")
}
