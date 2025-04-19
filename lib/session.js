const { RedisStore } = require("connect-redis");
const session = require("express-session");
const { createClient } = require("redis");

let redisClient = createClient();

redisClient.connect().then(() => {
  console.log("🔗 Redis 연결 성공!");
})
.catch((error) => {
  console.error("Redis 연결 실패:", error);
});

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_PASS || "temp-secret-key",
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 세션 만료 시간 24시간
  },
});

module.exports = { sessionMiddleware, redisClient };