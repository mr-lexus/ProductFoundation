fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Product Foundation Starter desktop shell");
}
