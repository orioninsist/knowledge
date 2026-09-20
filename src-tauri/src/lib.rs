use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use std::{fs, path::PathBuf};

fn sound_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("notification-sound"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn choose_notification_sound(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let selected = rfd::FileDialog::new()
        .add_filter("Audio", &["wav", "mp3", "ogg"])
        .pick_file();
    let Some(source) = selected else { return Ok(None) };
    let target = sound_path(&app)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::copy(&source, &target).map_err(|error| error.to_string())?;
    Ok(source.file_name().and_then(|name| name.to_str()).map(str::to_owned))
}

#[tauri::command]
fn notification_sound(app: tauri::AppHandle) -> Result<Option<Vec<u8>>, String> {
    let path = sound_path(&app)?;
    if !path.exists() { return Ok(None) }
    fs::read(path).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_notification_sound(app: tauri::AppHandle) -> Result<(), String> {
    let path = sound_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_productivity(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![show_productivity, choose_notification_sound, notification_sound, remove_notification_sound])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Open Productivity", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            if let Err(error) = app.autolaunch().enable() {
                eprintln!("could not enable Productivity autostart: {error}");
            }

            if std::env::args().any(|arg| arg == "--hidden") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run Knowledge Productivity");
}
