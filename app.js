const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const iconv = require('iconv-lite');
const session = require('./lib/session.js');
const db = require('./lib/db.js');
const bcrypt = require('bcrypt');
const hashPassword = require('./lib/bcrypt.js'); // 올바르게 가져오기
const multer = require('multer');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 업로드 파일 제공
app.use(session);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function formatDate() {
  const date = new Date();
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0'); // 월 (01~12)
  const DD = String(date.getDate()).padStart(2, '0'); // 일 (01~31)
  const HH = String(date.getHours()).padStart(2, '0'); // 시 (00~23)
  const mm = String(date.getMinutes()).padStart(2, '0'); // 분 (00~59)
  const SS = String(date.getSeconds()).padStart(2, '0'); // 초 (00~59)
  return `${YYYY}${MM}${DD}-${HH}${mm}${SS}`;
};

function authStatus(req, res) {
  if (req.session.is_logined) {
    return { 
      is_logined: true,
      user_id: req.session.user_id,
      username: req.session.username
    }
  } else {
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 파일 저장 폴더
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const encodedName = iconv.decode(Buffer.from(baseName, 'binary'), 'utf-8');
    const safeFileName = encodedName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const date = formatDate();
    cb(null, `${date}-${safeFileName}${ext}`);
  },
});

const upload = multer({ storage: storage }).array('userfile', 10);

app.get('/downloads/:filename', function(req, res) {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
  }

  res.download(filePath);
});

app.post('/uploads', upload, function (req, res, next) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
  }

  const id = req.body.id;
  const filenames = req.files.map(file => file.filename); // 파일명 배열

  let sqlQuery = `UPDATE tbl_board SET upload = CASE WHEN upload IS NULL THEN JSON_ARRAY(?) ELSE JSON_MERGE_PRESERVE(upload, JSON_ARRAY(${filenames.map(() => '?').join(', ')})) END WHERE id = ?;`;

  db.query(sqlQuery, [filenames, ...filenames, id], function(error, data) {
    if (error) {
      console.log(error);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send();
  });
});

app.delete('/uploads', async function (req, res) {
  const id = req.body.id;
  let files = req.body.file;

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
        console.error(`파일 삭제 실패: ${file}, 오류:`, err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  } catch (err) {
    console.log('라우터 실행 실패:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/header', (req, res) => {
  res.render('header', {authStatus: authStatus(req, res)});  // 'header.ejs' 템플릿을 렌더링하여 응답
});

app.get('/', (req, res) => {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let line = 5;
  if (req.cookies.line) {
    line = parseInt(req.cookies.line);
  }

  let where = '';
  let params = [];
  let search = req.query.search;
  if(search){
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
      selectOptionsHtml += `<option value="${option}" ${selected}>${option} 줄</option>`;
    });

    let page_total = 0;
    if(data.length > 0){
      page_total = Math.ceil(parseInt(data[0]['total']) / line);
    }

    res.render('list', { data, page_total, selectOptionsHtml, currentPage: page, search, like, view, authStatus: authStatus(req, res)});
  });
});

app.get('/boards/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const user_id = authStatus(req,res).user_id;

    // 쿼리 순차 실행 -> 병렬 실행(한번에 실행)
    const [[like], [comment], [data]] = await Promise.all([
      db.promise().query(`SELECT user_id FROM tbl_like WHERE board_id=?`, [id]),
      db.promise().query(`SELECT c.*, u.username FROM tbl_comment c LEFT JOIN tbl_user u ON c.user_id = u.id WHERE board_id=? ORDER BY c.created_at ASC;`, [id]),
      db.promise().query(`SELECT b.*, u.username FROM tbl_board b LEFT JOIN tbl_user u ON b.user_id=u.id WHERE b.id=?`, [id])
    ]);

    if (data && data.length > 0) {
      let view = data[0].view + 1;
      await db.promise().query(`UPDATE tbl_board SET view=? WHERE id=?`, [view, id]);
      let active = like.some((value) => value.user_id === user_id);
      res.render('view', { data, id, active, like, comment, user_id, authStatus: authStatus(req, res) });
    } else {
      res.status(404).send("요청하신 게시글을 찾을 수 없습니다.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 오류");
  }
});

app.get('/boards/:id/edit', (req, res) => {
  if(!req.session.is_logined){
    res.status(500).render('error', { errorMessage:'당신은 작성 권한이 없습니다. 로그인 후 이용 가능합니다.' } );
    return;
  }

  const id = req.params.id != 'new' ? req.params.id : '';
  const user_id = authStatus(req, res).user_id;
  
  if (id) {
    db.query(`SELECT * FROM tbl_board where id=?`, [id], function(error, data) {
      if (error) {
        return res.status(500).send('Internal Server Error');
      }
      if(data[0].user_id!=user_id) {
        return res.status(500).render('error', { errorMessage:'당신은 수정 권한이 없습니다.' } );
      }
      res.render('edit', { data, id, user_id, status: 'update', authStatus: authStatus(req, res) });
    });
  } else {
    res.render('edit', { data:'', id, user_id, status: 'create', authStatus: authStatus(req, res) });
  }
});

app.post('/boards', (req, res) => {
  let post = req.body;
  db.query(`INSERT INTO tbl_board (user_id, subject, content) VALUES (?,?,?);`, [post.user_id, post.subject, post.content], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send({ insertId: data.insertId });
  });
});

app.put('/boards/:id', (req, res) => {
  const id = req.params.id
  let post = req.body;
  db.query(`UPDATE tbl_board SET user_id=?, subject=?, content=? where id=?`, [post.user_id, post.subject, post.content, id], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error)
      return;
    }
    res.send();
  });
});

app.delete('/boards/:id', (req, res) => {
  const id = req.params.id;
  const user_id = authStatus(req,res).user_id;
  db.query(`DELETE FROM tbl_board where id=? and user_id=?`, [id, user_id], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send('Delete success');
  });
});

app.post('/likes/:id', (req, res) => {
  const id = req.params.id;
  const user_id = authStatus(req,res).user_id;
  if(user_id) {
    db.query(`INSERT INTO tbl_like(user_id,board_id) VALUES(?,?)`, [user_id, id], function(error, data) {
      if (error) {
        res.status(500).send('Internal Server Error');
        console.log(error);
        return;
      }
      res.send('add');
    })
  } else {
    res.status(500).send('회원만 추천 가능합니다.');
  }
});

app.delete('/likes/:id', (req, res) => {
  const id = req.params.id;
  const user_id = authStatus(req,res).user_id;
  if(user_id) {
    db.query(`DELETE FROM tbl_like WHERE user_id=? and board_id=?`, [user_id, id], function(error, data) {
      if (error) {
        res.status(500).send('Internal Server Error');
        return;
      }
      res.send('delete');
    });
  } else {
    res.status(500).send('회원만 추천 가능합니다.');
  }
});

app.post('/comments', (req, res) => {
  let post = req.body;
  const user_id = authStatus(req, res).user_id;
  db.query(`INSERT INTO tbl_comment (board_id, user_id, content) VALUES (?,?,?);`, [post.board_id, user_id, post.content], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error)
      return;
    }

    let insertedId = data.insertId;
    db.query(`SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username FROM tbl_comment c LEFT JOIN tbl_user u ON u.id = c.user_id WHERE c.id = ?;`, [insertedId], function(selectError, result) {
      if (selectError) {
        res.status(500).send('Internal Server Error');
        console.log(selectError);
        return;
      }
      res.send({ comment: result[0] });
    });
  });
});

app.put('/comments', (req, res) => {
  let post = req.body;
  const user_id = authStatus(req, res).user_id;
  db.query(`UPDATE tbl_comment SET content=? where id=? and user_id=?`, [post.content, post.id, user_id], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      console.log(error)
      return;
    }
    res.send();
  });
});

app.delete('/comments', (req, res) => {
  let post = req.body;
  const user_id = authStatus(req, res).user_id;
  db.query(`DELETE FROM tbl_comment where id=? and user_id=?`, [post.id, user_id], function(error, data) {
    if (error) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send('Delete success');
  });
});

app.get('/login', (req, res) => {
  if( authStatus(req, res) ) {
    res.render('error', { errorMessage:'이미 로그인 됐습니다!' })
  } else {
    res.render('login', { authStatus: authStatus(req, res) })
  }
});

app.post('/login', async (req, res) => {
  let post = req.body;
  db.query(`SELECT id, username, password FROM tbl_user WHERE username=?`,[post.username], function(error, data) {
    if(error){
      res.status(500).send('Internal Server Error');
      return;
    } else if(data && data.length > 0){
      if(data[0].username == post.username){
        bcrypt.compare(post.password, data[0].password, function(err, result) {
          if (result) { // 비밀번호가 일치하는 경우
            req.session.is_logined = true;
            req.session.username = data[0].username;
            req.session.user_id = data[0].id;
            req.session.save( function() {
              res.json({ success: true });
            })
          } else {
            res.json({ success: false, message: '비밀번호가 맞지 않습니다.' });
          }
        })
      } else {
        res.json({ success: false, message: '존재하지 않는 아이디입니다.' });
      }
    } else { //쿼리 결과가 0개인 경우[ 아이디가 없는 경우. ]
      res.json({ success: false, message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
  })
});

app.get('/logout', (req, res) => {
  req.session.destroy((err)=>{
    if(err)
      throw err;

    res.redirect('/')
  })
});

app.get('/signup', (req, res) => {
  res.render('signup', { authStatus: authStatus(req, res) });
});

app.post('/signup', async (req, res) => {
  try {
    let post = req.body;
    const hashedPassword = await hashPassword(post.password);
    db.query(`INSERT INTO tbl_user (username, password) VALUES (?,?);`, [post.username, hashedPassword], function(error, data) {
      if (error) {
        res.status(500).render('error', { errorMessage:'이미 존재하는 아이디 입니다.', authStatus: authStatus(req, res) } );
        return;
      }
      res.redirect('/login');
    });
  } catch {
    // 해싱 중 에러가 발생하면 처리
    res.status(500).render('error', { errorMessage: '비밀번호 해싱 중 오류가 발생했습니다.', authStatus: authStatus(req, res) });
  }
});

app.get('/settings', (req, res) => {
  res.render('setting');
});

app.post('/cookie', (req, res) => {
  if(req.body.line)
    res.cookie('line', req.body.line, { maxAge: 900000, httpOnly: true });

  if(req.body.view)
    res.cookie('view', req.body.view, { maxAge: 900000, httpOnly: true });

  if(req.body.like)
    res.cookie('like', req.body.like, { maxAge: 900000, httpOnly: true });

  res.send('Cookie set');
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});