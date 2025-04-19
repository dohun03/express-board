const mysql = require('mysql2');
require("dotenv").config();

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
  process.exit(1);  // 필수 환경 변수(env)가 없으면 애플리케이션 종료
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;