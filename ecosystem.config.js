module.exports = {
  apps: [
    {
      name: "my-app",
      script: "app.js",
      cwd: "/home/dlehgns0217/new_folder/CRUD", // app.js가 있는 디렉토리
      ignore_watch: ["node_modules", "sessions"],  // 감시 제외할 폴더
      watch_options: {
        followSymlinks: false,  // 심볼릭 링크 감지 안 함
      },
    },
  ],
};