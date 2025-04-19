const express = require('express');
const app = express();
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const cookieParser = require('cookie-parser');
const iconv = require('iconv-lite');
const { sessionMiddleware, redisClient } = require('./lib/session.js');
const db = require('./lib/db.js');
const bcrypt = require('bcrypt');
const cors = require('cors');
const hashPassword = require('./lib/bcrypt.js');
const multer = require('multer');
const nodemailer = require('nodemailer');

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/users', express.static(path.join(__dirname, 'users')));
app.use(sessionMiddleware);
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

require("dotenv").config();

function formatDate(format) {
  const date = new Date();
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0'); // 월 (01~12)
  const DD = String(date.getDate()).padStart(2, '0'); // 일 (01~31)
  const HH = String(date.getHours()).padStart(2, '0'); // 시 (00~23)
  const mm = String(date.getMinutes()).padStart(2, '0'); // 분 (00~59)
  const SS = String(date.getSeconds()).padStart(2, '0'); // 초 (00~59)

  switch(format) {
    case 'file':
      return `${YYYY}${MM}${DD}-${HH}${mm}${SS}`;
    case 'db':
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${SS}`;
    default:
      return '잘못된 형식입니다.';
  }
};

function authStatus(req, res) {
  if (req.session.isLogined) {
    return { 
      isLogined: true,
      userId: req.session.userId,
      username: req.session.username,
      admin: req.session.admin,
      profileImage: req.session.profileImage,
    }
  } else {
    return false;
  }
}

function sanitizeInput(input) { 
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

function sanitizeEditor(input) {
  return sanitizeHtml(input, {
    allowedTags: [
      'p', 'div', 'span', 'b', 'strong', 'i', 'u', 'em', 'a', 'ul', 'ol', 'li','s',
      'br', 'hr', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'blockquote', 'iframe', 'jodit'
    ],
    allowedAttributes: {
      '*': [
        'style', 'class', 'data-*', 'width', 'height', 'frameborder',
        'allowfullscreen', 'contenteditable', 'draggable'
      ],
      'a': ['href', 'name', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      'jodit': ['data-jodit-temp', 'data-jodit_iframe_wrapper', 'style', 'contenteditable', 'draggable']
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data']
    }
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.naver.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "이메일을 입력하세요." });

  const authCode = Math.floor(100000 + Math.random() * 900000).toString(); // 인증번호 생성

  console.log('인증코드:', authCode);

  try {
    await transporter.sendMail({
      from: `"MyApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "EX Community 이메일 인증번호",
      text: `인증번호: ${authCode}`,
    });

    req.session.email = email;
    req.session.authCode = authCode;

    res.send('인증번호 전송 완료');
  } catch (error) {
    res.status(500).send(error);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 파일 저장 폴더
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const encodedName = iconv.decode(Buffer.from(baseName, 'binary'), 'utf-8');
    const safeFileName = encodedName.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s]/g, '_');
    const date = formatDate('file');
    cb(null, `${date}-${safeFileName}${ext}`);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 한 파일당 5MB 제한
    files: 5, // 최대 5개 파일 제한
    fieldSize: 25 * 1024 * 1024 // 전체 업로드 크기 25MB 제한
   },
}).array('userfile', 5);

app.get('/downloads/:filename', function(req, res) {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  res.download(filePath);
});

app.post('/uploads', function (req, res) {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // 에러 코드에 따라 메시지 처리
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send('파일 크기가 너무 큽니다! (최대 5MB)');
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).send('파일 개수 제한을 초과했습니다! (최대 5개)');
      }
      if (err.code === 'LIMIT_FIELD_SIZE') {
        return res.status(413).send('총 업로드 크기가 너무 큽니다! (최대 25MB)');
      }

      return res.status(500).send('파일 업로드 중 오류가 발생했습니다.');
    } else if (err) {
      return res.status(500).json({ error: '서버 내부 오류 발생' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const { id } = req.body;
    const filenames = req.files.map(file => sanitizeInput(file.filename));

    const sqlQuery = `
      UPDATE tbl_board SET upload = CASE 
        WHEN upload IS NULL THEN JSON_ARRAY(?) 
        ELSE JSON_MERGE_PRESERVE(upload, JSON_ARRAY(${filenames.map(() => '?').join(', ')})) 
      END WHERE id = ?;
    `;

    db.query(sqlQuery, [filenames, ...filenames, id], function (error) {
      if (error) {
        console.log(error);
        return res.status(500).json({ error: '데이터베이스 업데이트 중 오류 발생' });
      }
      res.json({ success: true, message: '파일 업로드 성공!' });
    });
  });
});

app.delete('/uploads', async function (req, res) {
  const { id, files } = req.body;

  if (!files) {
    return res.status(400).json({ error: '삭제할 파일이 없습니다.' });
  }

  try {
    if (Array.isArray(files)) {
      // 배열인 경우 여러 파일 삭제
      const results = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(__dirname, 'uploads', file);
          try {
            await fs.promises.access(filePath); // 파일 존재 여부 확인
            await fs.promises.unlink(filePath); // 파일 삭제
            console.log(`파일 전체 삭제 성공: ${file}`);
            return { file, success: true };
          } catch (err) {
            console.error(`파일 삭제 실패: ${file}, 오류:`, err);
          }
        })
      );
      res.json({ success: true, deletedFiles: results });

    } else {
      const filePath = path.join(__dirname, 'uploads', files);
      try {
        await fs.promises.access(filePath);
        await fs.promises.unlink(filePath);
        console.log(`파일 단일 삭제 성공: ${files}`);
        await db.promise().query(
          `UPDATE tbl_board SET upload = JSON_REMOVE(upload, JSON_UNQUOTE(JSON_SEARCH(upload, 'one', ?))) WHERE id = ?;`,
          [files, id]
        );
        console.log('파일 삭제 후 DB 업데이트 성공');
        res.json({ success: true, deletedFile: files });
        
      } catch (err) {
        console.error(`파일 삭제 실패: ${files}, 오류:`, err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'users/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const encodedName = iconv.decode(Buffer.from(baseName, 'binary'), 'utf-8');
    const safeFileName = encodedName.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s]/g, '_');
    const date = formatDate('file');
    cb(null, `${date}-${safeFileName}${ext}`);
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('jpg, jpeg, png, webp 형식의 이미지 파일만 업로드 가능합니다.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.post('/uploads/profile', (req, res) => {
  uploadProfile.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send('파일 크기가 너무 큽니다! (최대 5MB)');
      }
      return res.status(500).send('파일 업로드 중 오류가 발생했습니다.');
    } else if (err) {
      return res.status(400).send(err.message);
    }

    if (!req.file) {
      return res.status(400).send('파일이 업로드 되지 않았습니다.');
    }

    const { userId } = req.session;
    const filename = sanitizeInput(req.file.filename);

    db.query(`UPDATE tbl_user SET profile_image=? WHERE id=?`, [filename, userId], function (err, result) {
      if (err) {
        console.error('DB 오류:', err);
        return res.status(500).send('프로필 이미지 저장 실패');
      }

      req.session.profileImage = filename;
      req.session.save((err) => {
        if (err) {
          console.error("세션 저장 중 오류:", err);
          return res.status(500).send("세션 저장 중 오류가 발생했습니다.");
        }

        res.json({ success: true, filename });
      });
    });
  });
});

app.delete('/uploads/profile', async function (req, res) {
  const userId = req.session.userId;
  const file = req.session.profileImage;

  if (!userId) {
    return res.status(400).json({ error: '삭제 권한이 없습니다.' });
  }

  if (!file) {
    return res.status(400).json({ error: '삭제할 파일이 없습니다.' });
  }

  const safeFile = path.basename(file); // 디렉토리 무력화
  const filePath = path.join(__dirname, 'users', safeFile);
  
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    await db.promise().query(`UPDATE tbl_user SET profile_image='' WHERE id=?`,[userId]);
    req.session.profileImage = '';
    req.session.save((err) => {
      if (err) {
        console.error("세션 저장 중 오류:", err);
        return res.status(500).send("세션 저장 중 오류가 발생했습니다.");
      }
      res.status(200).send('파일 삭제 성공');
    });
  } catch (err) {
    console.error(`파일 삭제 실패: ${file}, 오류:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let line = 100;
  
  if (req.cookies.line) {
    line = parseInt(req.cookies.line);
  }

  let where = '';
  let params = [];
  let search = req.query.search;

  if (search) {
    where += `WHERE subject LIKE ? `;
    params.push(`%${search}%`);
  }

  params.push(line * (page - 1), line);

  let order_by = '';
  let view = req.cookies.view;
  switch (view) {
    case 'asc':
      order_by += 'view ASC, ';
      break;
    case 'desc':
      order_by += 'view DESC, ';
      break;
    default:
      order_by += '';
      break;
  }
  let like = req.cookies.like;
  switch (like) {
    case 'asc':
      order_by += 'like_count ASC, ';
      break;
    case 'desc':
      order_by += 'like_count DESC, ';
      break;
    default:
      order_by += '';
      break;
  }

  order_by += 'B.id DESC ';

  let sqlQuery = `SELECT B.*, U.username,
    COUNT(*) OVER() AS total, 
    COUNT(DISTINCT L.id) AS like_count, 
    COUNT(DISTINCT C.id) AS comment_count,
    MAX(B.view) AS view
  FROM tbl_board B
  LEFT JOIN tbl_like L ON B.id = L.board_id
  LEFT JOIN tbl_comment C ON B.id = C.board_id
  LEFT JOIN tbl_user U ON B.user_id = U.id ${where}GROUP BY B.id ORDER BY ${order_by}LIMIT ?, ?;`;
  // console.log('실행 쿼리:', db.format(sqlQuery, params));
  db.query(sqlQuery, params, function (error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    
    let selectOptionsHtml = '';
    const options = [5, 10, 50, 100];
    options.forEach(option => {
      const selected = option === line ? 'selected' : '';
      selectOptionsHtml += `<option value='${option}' ${selected}>${option} 줄</option>`;
    });

    let total = parseInt(data[0]['total']);
    let page_total = 0;

    if (data.length > 0) {
      page_total = Math.ceil(total / line);
    }

    res.render('title', { body:'list', data, total, page_total, selectOptionsHtml, currentPage: page, search, like, view, authStatus: authStatus(req, res)});
  });
});

app.get('/boards/:id', (req, res) => {
  const { id } = req.params;

  db.query(`SELECT b.*, u.username FROM tbl_board b LEFT JOIN tbl_user u ON b.user_id=u.id WHERE b.id=?`, [id], function(error, data) {
    if (error) {
      return res.status(500).send('게시글 불러오기에 실패했습니다.');
    }

    if (data.length === 0) {
      res.render('title', { body:'error', errorMessage: '존재하지 않는 게시글 입니다.', authStatus: authStatus(req, res) });
      return;
    }

    let view = data?.[0]?.view + 1;

    db.query(`UPDATE tbl_board SET view=? WHERE id=?`, [view, id], function(error, view) {
      if (error) {
        return res.status(500).send('조회수 증가에 실패했습니다.');
      }
  
      res.render('title', { body:'view', data, id, authStatus: authStatus(req, res) });
    });
  });
});

app.get('/boards/:id/edit', (req, res) => {
  if (!req.session.isLogined) {
    res.status(403).render('title', { body:'error', errorMessage:'당신은 작성 권한이 없습니다. 로그인 후 이용 가능합니다.', authStatus: authStatus(req, res) });
    return;
  }

  const id = req.params.id != 'new' ? req.params.id : '';
  const { userId } = req.session;
  
  if (id) {
    db.query(`SELECT * FROM tbl_board where id=?`, [id], function(error, data) {
      if (error) {
        return res.status(500).send('Internal Server Error');
      }
      if (data?.[0]?.user_id!=userId) {
        return res.status(403).render('title', { body:'error', errorMessage:'당신은 수정 권한이 없습니다.', authStatus: authStatus(req, res) } );
      }
      res.render('title', { body:'edit', data, id, userId, status: 'update', authStatus: authStatus(req, res) });
    });
  } else {
    res.render('title', { body:'edit', data:'', id, userId, status: 'create', authStatus: authStatus(req, res) });
  }
});

app.post('/boards', (req, res) => {
  const subject = sanitizeInput(req.body.subject);
  const content = sanitizeEditor(req.body.content);
  const { userId } = req.session;

  console.log(subject, content)

  if (!subject || !content) {
    return res.status(400).send('제목과 내용을 입력해주세요.');
  }

  db.query(`INSERT INTO tbl_board (user_id, subject, content) VALUES (?,?,?);`, [userId, subject, content], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send({ insertId: data.insertId });
  });
});

app.patch('/boards/:id', (req, res) => {
  const { id } = req.params;
  const subject = sanitizeInput(req.body.subject);
  const content = sanitizeEditor(req.body.content);
  const { userId } = req.session;
  const date = formatDate('db');

  if (!subject || !content) {
    return res.status(400).send('제목과 내용을 입력해주세요.');
  }

  db.query(`UPDATE tbl_board SET subject=?, content=?, updated_at=? where id=? and user_id=?`, [subject, content, date, id, userId], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error);
      return;
    }
    res.status(204).send();
  });
});

app.delete('/boards/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.session;

  db.query(`DELETE FROM tbl_board where id=? and user_id=?`, [id, userId], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send('Delete success');
  });
});

app.get('/boards/:boardId/comments', (req, res) => {
  const { boardId } = req.params;
  const sqlQuery = `
  SELECT 
    c.id AS comment_id,
    c.board_id AS comment_board_id,
    c.user_id AS comment_user_id,
    c.content AS comment_content,
    c.created_at AS comment_created_at,
    c.updated_at AS comment_updated_at,

    u.id AS user_id,
    u.username AS user_username,
    u.admin AS user_admin,
    u.created_at AS user_created_at,
    u.profile_image AS user_profile_image,

    (SELECT COUNT(*) FROM tbl_comment WHERE board_id = ?) AS total

  FROM tbl_comment c
  LEFT JOIN tbl_user u ON c.user_id = u.id
  WHERE c.board_id = ?
  ORDER BY c.created_at ASC;`

  db.query(sqlQuery, [boardId, boardId], function(error, data) {
    if (error) {
      console.log(error)
      return res.status(500).send('댓글 불러오기에 실패했습니다.');
    }

    res.status(200).send(data);
  });
});

app.get('/boards/:boardId/comments/:commentId', (req, res) => {
  const { boardId, commentId } = req.params;

  const sqlQuery = `
  SELECT 
    c.id AS comment_id,
    c.board_id AS comment_board_id,
    c.user_id AS comment_user_id,
    c.content AS comment_content,
    c.created_at AS comment_created_at,
    c.updated_at AS comment_updated_at,

    u.id AS user_id,
    u.username AS user_username,
    u.admin AS user_admin,
    u.created_at AS user_created_at,
    u.profile_image AS user_profile_image

  FROM tbl_comment c
  LEFT JOIN tbl_user u ON c.user_id = u.id
  WHERE c.board_id = ? and c.id = ?
  ORDER BY c.created_at ASC;`

  db.query(sqlQuery, [boardId, commentId], function(error, data) {
    if (error) {
      console.log(error)
      return res.status(500).send('댓글 불러오기에 실패했습니다.');
    }

    res.status(200).send(data);
  });
});

app.post('/boards/:boardId/comments', (req, res) => {
  const { boardId } = req.params;
  const content = sanitizeInput(req.body.content);
  const { userId } = req.session;

  if (!content){
    return res.status(400).send('내용을 입력하세요.');
  }

  db.query(`INSERT INTO tbl_comment (board_id, user_id, content) VALUES (?,?,?);`, [boardId, userId, content], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error)
      return;
    }

    res.status(204).send();
  });
});

app.patch('/boards/:boardId/comments/:commentId', (req, res) => {
  const { boardId, commentId } = req.params;
  const content = sanitizeInput(req.body.content);
  const { userId } = req.session;

  if (!content){
    return res.status(400).send('내용을 입력하세요.');
  }

  db.query(`UPDATE tbl_comment SET content=? where board_id=? and user_id=? and id=?`, [content, boardId, userId, commentId], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error)
      return;
    }
    res.status(204).send();
  });
});

app.delete('/boards/:boardId/comments/:commentId', (req, res) => {
  const { boardId, commentId } = req.params;
  const { userId } = req.session;

  db.query(`DELETE FROM tbl_comment where board_id=? and user_id=? and id=?`, [boardId, userId, commentId], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(204).send();
  });
});

app.get('/boards/:id/likes', (req, res) => {
    const { id } = req.params;
    const { userId } = req.session;

    db.query(`SELECT (SELECT COUNT(*) FROM tbl_like WHERE board_id = ?) AS total_likes, 
    EXISTS (SELECT 1 FROM tbl_like WHERE board_id = ? AND user_id = ?) AS has_liked;`, [id, id, userId], function(error, like) {
      if (error) {
        console.log(error)
        return res.status(500).send('좋아요 불러오기에 실패했습니다.');
      }
      
      res.status(200).send(like);
    });
});

app.post('/boards/:id/likes', (req, res) => {
  const { id } = req.params;
  const { userId } = req.session;

  if (userId) {
    db.query(`INSERT INTO tbl_like(board_id, user_id) VALUES(?,?)`, [id, userId], function(error, data) {
      if (error) {
        res.status(500).send('Internal Server Error');
        console.log(error);
        return;
      }
      res.status(200).send('add');
    })
  } else {
    res.status(403).send('회원만 추천 가능합니다.');
  }
});

app.delete('/boards/:id/likes', (req, res) => {
  const { id } = req.params;
  const { userId } = req.session;

  if (userId) {
    db.query(`DELETE FROM tbl_like WHERE board_id=? and user_id=?`, [id, userId], function(error, data) {
      if (error) {
        res.status(500).send('Internal Server Error');
        return;
      }
      res.status(200).send('delete');
    });
  } else {
    res.status(403).send('회원만 추천 가능합니다.');
  }
});

app.get('/login', (req, res) => {
  if (req.session.isLogined) {
    res.render('title', { body:'error', errorMessage:'이미 로그인 됐습니다!', authStatus: authStatus(req, res) })
  } else {
    res.render('title', { body:'login', authStatus: authStatus(req, res) })
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 입력해주세요.');
  }

  db.query(`SELECT id, username, password, admin, profile_image FROM tbl_user WHERE username=?`,[username], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }

    if (data.length === 0) {
      res.status(404).send('존재하지 않는 아이디입니다.');
      return;
    }

    bcrypt.compare(password, data[0].password, function(err, result) {
      if (err) {
        res.status(500).send('비밀번호 확인 중 오류가 발생했습니다.');
        return;
      }

      if (result) { // 비밀번호가 일치하는 경우
        req.session.isLogined = true;
        req.session.userId = data[0].id;
        req.session.username = data[0].username;
        req.session.admin = data[0].admin;
        req.session.profileImage = data[0].profile_image;
        req.session.save(async (err) => {
          if (err) {
            console.error("세션 저장 중 오류:", err);
            return res.status(500).send("세션 저장 중 오류가 발생했습니다.");
          }

          try {
            await redisClient.set(`user:${data[0].id}`, req.sessionID, { EX: 86400 });
            res.status(200).send();
          } catch (error) {
            res.status(500).send("세션 저장 중 오류가 발생했습니다.");
          }
        });
      } else {
        res.status(401).send('비밀번호가 맞지 않습니다.');
      }
    });
  });
});

app.post('/logout', (req, res) => {
  const { userId } = req.session;

  req.session.destroy(async (err)=>{
    if (err)
      throw err;

      try {
        await redisClient.del(`user:${userId}`);
        res.status(200).send();
      } catch (error) {
        console.error(error)
        res.status(500).send("세션 삭제 중 오류가 발생했습니다.");
      }
  })
});

app.get('/signup', (req, res) => {
  if (req.session.isLogined) {
    res.status(403).render('title', { body:'error', errorMessage:'이미 로그인이 되어있습니다.', authStatus: authStatus(req, res) } );
    return;
  }

  res.render('title', { body:'signup', authStatus: authStatus(req, res) });
});

app.get('/settings', (req, res) => {
  const { userId } = req.session;

  if (!req.session.isLogined) {
    res.status(403).render('title', { body:'error', errorMessage:'당신은 접근 권한이 없습니다. 로그인 후 이용 가능합니다.', authStatus: authStatus(req, res) } );
    return;
  }

  db.query(`SELECT username, admin, email, profile_image FROM tbl_user WHERE id=?`,[userId], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }

    res.render('title', { body:'setting', data, authStatus: authStatus(req, res)});
  });
});

app.get('/admin', (req, res) => {
  if (!req.session.isLogined || !req.session.admin) {
    res.status(403).render('title', { body:'error', errorMessage:'당신은 관리자 권한이 없습니다.', authStatus: authStatus(req, res) } );
    return;
  }

  db.query(`SELECT * FROM tbl_user`, function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }

    res.render('title', { body:'admin', data, authStatus: authStatus(req, res)});
  });
});

app.post('/users', async (req, res) => {
  try {
    const { email, authCode, username, password } = req.body;
    const patternUsername = /^[A-Za-z0-9가-힣]{2,12}$/;
    const patternPassword = /^[A-Za-z0-9]{4,20}$/;

    if (!email || !authCode || !username || !password) {
      return res.status(400).send('빈 칸을 입력 해주세요.');
    }

    if (authCode !== req.session.authCode) {
      return res.status(401).send('인증번호가 일치하지 않습니다.');
    }

    if (email !== req.session.email) {
      return res.status(401).send('이메일이 일치하지 않습니다.');
    }

    if (!patternUsername.test(username) || !patternPassword.test(password)) {
      return res.status(400).send('조건에 맞게 아이디와 비밀번호를 입력해주세요.');
    }

    const hashedPassword = await hashPassword(password);

    await db.promise().query(`INSERT INTO tbl_user (username, password, email) VALUES (?,?,?);`, [username, hashedPassword, email]);

    res.status(200).send("회원가입에 성공했습니다.");
  } catch (err) {
    console.log(err)
    return res.status(500).send('이메일 또는 아이디가 이미 존재합니다.');
  }
});

app.patch('/users/:id/username', (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  const patternUsername = /^[A-Za-z0-9가-힣]{2,12}$/;

  if (id===req.session.userId) {
    return res.status(400).send('고유 아이디 값이 다릅니다.');
  }

  if (!username) {
    return res.status(400).send('아이디를 입력해주세요.');
  }

  if (!patternUsername.test(username)) {
    return res.status(400).send('조건에 맞게 아이디를 입력해주세요.');
  }

  db.query(`UPDATE tbl_user SET username = ? WHERE id=?`,[username, id], function(error, data) {
    if (error) {
      res.status(500).send('아이디가 이미 존재합니다!');
      return;
    }
    req.session.username = username;
    req.session.save(() => {
      res.status(200).send('아이디가 변경 되었습니다!');
    });
  });
});

app.patch('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    let { password, newPassword } = req.body;
    const patternPassword = /^[A-Za-z0-9]{4,20}$/;

    if (id===req.session.userId) {
      return res.status(400).send('고유 아이디 값이 다릅니다.');
    }

    if (!password) {
      return res.status(400).send('비밀번호를 입력해주세요.');
    }
  
    if (!patternPassword.test(password)) {
      return res.status(400).send('조건에 맞게 비밀번호를 입력해주세요.');
    }
    
    // 관리자는 비밀번호 검증 필요 X
    if (!req.session.admin) {
      const [data] = await db.promise().query(`SELECT id, username, password FROM tbl_user WHERE id=?`,[id]);
  
      if (data.length === 0) {
        return res.status(404).send('존재하지 않는 아이디입니다.');
      }
  
      const match = await bcrypt.compare(password, data[0].password);
      console.log(match)
    
      if (!match) {
        return res.status(401).send('비밀번호가 일치하지 않습니다.');
      }
    }
  
    newPassword = await hashPassword(newPassword);

    await db.promise().query(`UPDATE tbl_user SET password = ? WHERE id=?`,[newPassword, id]);

    res.status(200).send('비밀번호가 변경 되었습니다!');
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
  
    if (!id) {
      return res.status(400).send('아이디를 입력해주세요.');
    }
  
    // 관리자거나, 본인 인증이 되거나
    if (!(req.session.admin || id==req.session.userId)) {
      return res.status(403).send('당신은 삭제 권한이 없습니다.');
    }
  
    await db.promise().query(`DELETE FROM tbl_user WHERE id=?`,[id]);

    const sessionId = await redisClient.get(`user:${id}`);

    await redisClient.del(`user:${id}`);
    await redisClient.del(`sess:${sessionId}`);

    res.status(200).send('아이디가 삭제 되었습니다.');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/cookie', (req, res) => {
  const { line, view, like } = req.body;
  const filter = ['asc', 'desc', 'default'];
  
  if (Number.isInteger(parseInt(line)))
    res.cookie('line', line, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });

  if (filter.includes(view))
    res.cookie('view', view, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });

  if (filter.includes(like))
    res.cookie('like', like, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });

  res.send('Cookie set');
});

app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});