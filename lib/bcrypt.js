const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const hashedPassword = await bcrypt.hash(password, 10); //해싱 강도 (기본적으로 10 추천)
    return hashedPassword;
}

module.exports = hashPassword;