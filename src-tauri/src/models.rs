use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResult {
    pub success: bool,
    pub message: String,
    pub output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptParams {
    pub args: Option<Vec<String>>,
    pub env: Option<Vec<(String, String)>>,
    pub working_dir: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub icon_path: Option<String>,
    pub app_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClickAction {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(rename = "action")]
    pub action_data: ActionData,
    #[serde(default, deserialize_with = "deserialize_icon")]
    pub icon: Option<ActionIcon>,
    #[serde(rename = "categoryId")]
    pub category_id: String,
    #[serde(default)]
    pub description: String,
}

fn deserialize_icon<'de, D>(deserializer: D) -> Result<Option<ActionIcon>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::Null => Ok(None),
        serde_json::Value::String(s) => Ok(Some(ActionIcon {
            icon_type: "emoji".to_string(),
            value: s,
        })),
        serde_json::Value::Object(_) => {
            serde_json::from_value(value).map_err(|e| D::Error::custom(e.to_string()))
        }
        _ => Ok(None),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionData {
    #[serde(rename = "type")]
    pub action_type: String,
    pub value: String,
    #[serde(default)]
    pub params: Option<ScriptParams>,
    #[serde(default, rename = "openWith")]
    pub open_with: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionIcon {
    #[serde(rename = "type")]
    pub icon_type: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(rename = "order", default)]
    pub order_index: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(default, rename = "minimizeToTray")]
    pub minimize_to_tray: bool,
    #[serde(
        default = "default_preferred_text_editor",
        rename = "preferredTextEditor"
    )]
    pub preferred_text_editor: String,
    #[serde(
        default = "default_preferred_markdown_editor",
        rename = "preferredMarkdownEditor"
    )]
    pub preferred_markdown_editor: String,
}

fn default_preferred_text_editor() -> String {
    "Visual Studio Code".to_string()
}

fn default_preferred_markdown_editor() -> String {
    "Visual Studio Code".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutsSettings {
    #[serde(default = "default_global_invoke")]
    #[serde(rename = "globalInvoke")]
    pub global_invoke: String,
}

fn default_global_invoke() -> String {
    "CommandOrControl+Shift+Space".to_string()
}

impl Default for ShortcutsSettings {
    fn default() -> Self {
        Self {
            global_invoke: default_global_invoke(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppSettingsData {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(default)]
    pub shortcuts: ShortcutsSettings,
}

pub struct AppState {
    pub tray: Option<tauri::tray::TrayIcon>,
    pub minimize_to_tray: std::sync::atomic::AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            tray: None,
            minimize_to_tray: std::sync::atomic::AtomicBool::new(false),
        }
    }
}
