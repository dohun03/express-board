# ✅ EX-Community 게시판 프로그램 by 이도훈

> Node.js 환경 Express.js 프레임워크 기반으로 개발한 백엔드 CRUD 게시판 프로젝트입니다.\
> RESTful API 원칙을 기반으로 사용자 인증, 게시글/댓글 관리, 파일 업로드 기능 등을 구현했습니다.\
> 효율적인 아키텍처 설계와 실무 중심의 API 개발 역량 강화를 목표로 한 프로젝트입니다.
>
> **진행 기간은 [ 25.01.16 ~ 25.04.21 (약 3개월) ]** 입니다.
>
>

### ✅ 목차

1. [프로그램 주요 기능](#프로그램-주요-기능)  
   - [1. 사용자 관리 (생성 / 수정 / 삭제 / 목록 조회)](#1-사용자-관리-생성--수정--삭제--목록-조회)  
     - [1.1 사용자 생성 (회원가입/로그인)](#11-사용자-생성-회원가입로그인)  
     - [1.2 사용자 수정 (개인 설정)](#12-사용자-수정-개인-설정)  
     - [1.3 사용자 삭제 (회원 탈퇴)](#13-사용자-삭제-회원-탈퇴)  
     - [1.4 사용자 목록조회 (관리자)](#14-사용자-목록조회-관리자)  
   - [2. 게시글 관리 (작성 / 조회 / 삭제 / 목록 조회)](#2-게시글-관리-작성--조회--삭제--목록-조회)  
     - [2.1 게시글 작성](#21-게시글-작성)  
       - [2.1.1 첨부파일 (작성화면)](#211-첨부파일-작성화면)  
     - [2.2 게시글 조회](#22-게시글-조회)  
       - [2.2.1 댓글 관리](#221-댓글-관리)  
       - [2.2.2 좋아요 관리](#222-좋아요-관리)  
     - [2.3 게시글 삭제](#23-게시글-삭제)  
     - [2.4 게시글 목록 조회](#24-게시글-목록-조회)  
2. [사용한 기술 스택](#사용한-기술-스택)  
3. [ERD 데이터 모델링](#erd-데이터-모델링)  
4. [설치 및 실행 방법](#설치-및-실행-방법)  
5. [📘 API 명세서](#📘-api-명세서)  
6. [문제 해결](#문제-해결)  
7. [추가 구현하고 싶은 기능들](#추가-구현하고-싶은-기능들)  

## [프로그램 주요 기능]

### 1. 사용자 관리 (생성 / 수정 / 삭제 / 목록 조회)
  #### 1.1 사용자 생성 (회원가입/로그인)
  - 이메일, 이메일 인증번호, 아이디(영문, 한글, 숫자, 2-12자), 비밀번호(영문, 숫자, 4-20자)를 입력한다.
  - 이메일 인증번호가 일치해야 한다.
  - 아이디, 이메일은 중복이 불가하다.
  - 회원가입 시 작성한 아이디와 비밀번호로 로그인 할 수 있다.
  - 로그아웃을 통해 로그인 상태를 해제할 수 있다.

  #### 1.2 사용자 수정 (개인 설정)
  - 사용자의 개인 설정에서 프로필 사진, 아이디, 비밀번호를 변경할 수 있다.
  - 프로필 사진 업로드는 jpeg, jpg, png, webp 확장자만 허용된다.

  #### 1.3 사용자 삭제 (회원 탈퇴)
  - 회원 탈퇴는 사용자 본인 또는 관리자가 수행할 수 있다.
  - 회원 탈퇴시 사용자의 모든 게시글, 좋아요, 댓글, 프로필 사진이 서버에서 삭제된다.

  #### 1.4 사용자 목록조회 (관리자)
  - 관리자는 관리자 페이지를 통해 모든 사용자 목록(고유 넘버, 아이디, 이메일, 가입일)을 조회할 수 있다.

### 2. 게시글 관리 (작성 / 조회 / 삭제 / 목록 조회)

#### 2.1 게시글 작성

- 게시글 작성은 회원만 가능하다.
- 게시글 작성 시 에디터 기능을 사용하여 본문에 사진, 영상 등 첨부가 가능하다.
- 게시글 수정은 작성자 본인만 가능하다.

  #### 2.1.1 첨부파일 (작성화면)
  - 게시글 작성 중 첨부파일 추가 및 삭제가 가능하다.
  - 첨부파일은 1개당 최대 5MB, 한번에 최대 5개씩 업로드가 가능하다.

#### 2.2 게시글 조회
- 선택한 게시글의 제목, 본문 내용, 작성자 아이디, 작성 날짜, 첨부파일을 볼 수 있다.
- 선택한 게시글의 첨부파일을 다운로드 할 수 있다.
- 선택한 게시글의 좋아요 수를 볼 수 있다.
- 선택한 게시글에 등록된 모든 댓글을 볼 수 있다.
- 선택한 게시글은 작성자 본인일 경우에만 수정/삭제 할 수 있다.

  #### 2.2.1 댓글 관리

  - 게시글 조회 화면에서 댓글을 작성할 수 있으며, 댓글 작성은 회원만 가능하다.
  - 댓글에서 댓글 작성자의 프로필 사진, 아이디, 작성일자, 본문 내용을 볼 수 있다.
  - 댓글은 작성자 본인일 경우에만 수정/삭제 할 수 있다.

  #### 2.2.2 좋아요 관리

  - 게시글마다 토글 방식으로 좋아요를 누를 수 있으며, 좋아요는 회원만 가능하다.

#### 2.3 게시글 삭제

- 게시글 삭제는 작성자 본인만 가능하다.
- 게시글 삭제 시 첨부파일도 함께 서버에서 삭제된다.

#### 2.4 게시글 목록 조회

- 게시글 목록 화면에서 각 게시물들의 제목, 댓글 수, 첨부파일 여부, 작성자 아이디, 작성일자, 좋아요 수, 조회수를 볼 수 있다.
- 게시글 목록 화면에서 페이지당 게시글 수 설정, 페이지 이동, 검색이 가능하며, 조회수 또는 좋아요 순으로 정렬할 수 있습니다.

## [사용한 기술 스택]

- **Node.js / Express.js**: REST API 백엔드 서버 구축
- **MySQL**: 관계형 데이터 모델링 및 CRUD 쿼리 작성
- **Redis**: 세션 캐싱 및 이메일 인증 토큰 저장 용도
- **EJS / Bootstrap / jQuery**: 프론트 UI 구현 및 이벤트 처리

<div align=center> 
<img height="30" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
<img height="30" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/jQuery-0769AD?style=flat-square&logo=jquery&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/EJS-44B8B8?style=flat-square&logo=ejs&logoColor=white" />
<br/>
<img height="30" src="https://img.shields.io/badge/MySql-4479A1?style=flat-square&logo=mysql&logoColor=white"/>
<img height="30" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/>
<img height="30" src="https://img.shields.io/badge/GitHub-black?style=flat-square&logo=GitHub&logoColor=white"/>
<br/>
</div>

## [ERD 데이터 모델링]

- **tbl_user**: 사용자 정보를 저장하는 테이블.
- **tbl_board**: 게시글에 대한 내용을 저장.
- **tbl_comment**: 게시글에 달린 댓글을 저장.
- **tbl_like**: 게시글에 달린 좋아요를 저장.

<img src="https://github.com/user-attachments/assets/ce434c6d-83b0-4cce-aafd-1f40c7b07f42">

## [설치 및 실행 방법]

실행 환경
- Node.js 20.18.3
- MySQL 8.0.36
- Redis 5.0.7

프로젝트 설치 및 실행
``` bash

git clone https://github.com/dohun03/express-board.git

cd your-project # 프로그램이 실행될 디렉토리로 이동

mkdir uploads; mkdir users # 파일 업로드 디렉토리 생성

npm install

npm start

```
mysql 테이블 생성 쿼리
```

CREATE TABLE tbl_comment (
  id int NOT NULL AUTO_INCREMENT,
  board_id int NOT NULL,
  user_id int DEFAULT NULL,
  parent_id int DEFAULT NULL,
  content text NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY board_id (board_id),
  KEY user_id (user_id),
  KEY parent_id (parent_id),
  CONSTRAINT fk_comment_board FOREIGN KEY (board_id) REFERENCES tbl_board (id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES tbl_user (id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=344 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_like (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  board_id int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id,board_id),
  KEY fk_likes_board (board_id),
  CONSTRAINT fk_likes_board FOREIGN KEY (board_id) REFERENCES tbl_board (id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES tbl_user (id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_board (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL DEFAULT (0),
  subject varchar(255) DEFAULT NULL,
  content longtext,
  view int NOT NULL DEFAULT '0',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT NULL,
  upload json DEFAULT NULL,
  PRIMARY KEY (id),
  KEY fk_board_user (user_id),
  CONSTRAINT fk_board_user FOREIGN KEY (user_id) REFERENCES tbl_user (id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_user (
  id int NOT NULL AUTO_INCREMENT,
  username varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  admin tinyint NOT NULL DEFAULT '0',
  email varchar(255) DEFAULT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  profile_image varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY username (username)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

```
.env 파일 작성 예시
```
DB_HOST=mysql db host
DB_USER=mysql db user
DB_PASS=mysql db password
DB_NAME=mysql db name

SESSION_PASS=redis password

EMAIL_USER=your smtp email
EMAIL_PASS=your email password
```

## 📘 API 명세서

> 인증이 필요한 API는 세션 로그인 상태에서만 요청할 수 있습니다.

### 🔐 인증 API

| 메서드  | URL            | 설명                 | 인증 |
|--------|----------------|----------------------|------|
| POST   | `/login`       | 로그인 (세션 저장)         | ❌   |
| POST   | `/logout`      | 로그아웃 (세션 제거)       | ✅   |
| POST   | `/users`       | 회원가입               | ❌   |
| GET    | `/signup`      | 회원가입 페이지 렌더링      | ❌   |
| GET    | `/login`       | 로그인 페이지 렌더링       | ❌   |
| GET    | `/settings`    | 사용자 설정 페이지 조회     | ✅   |
| GET    | `/admin`       | 관리자 페이지 조회         | ✅ (관리자만) |
| PATCH  | `/users/:id/username` | 아이디 수정           | ✅   |
| PATCH  | `/users/:id/password` | 비밀번호 수정         | ✅   |
| DELETE | `/users/:id`   | 유저 삭제               | ✅ (관리자 또는 본인) |

### 📧 이메일 인증

| 메서드 | URL           | 설명              | 인증 |
|--------|---------------|-------------------|------|
| POST   | `/send-code`  | 인증번호 이메일 전송    | ❌   |

### 📝 게시글 API

| 메서드  | URL               | 설명                         | 인증 |
|---------|-------------------|------------------------------|------|
| GET     | `/`               | 게시글 목록 (검색, 필터, 페이지네이션 포함) | ❌   |
| GET     | `/boards/:id`     | 게시글 상세 조회                  | ❌   |
| POST    | `/boards`         | 게시글 작성                     | ✅   |
| GET     | `/boards/:id/edit`| 게시글 수정 페이지 렌더링            | ✅ (본인만) |
| PATCH   | `/boards/:id`     | 게시글 수정                     | ✅ (본인만) |
| DELETE  | `/boards/:id`     | 게시글 삭제                     | ✅ (본인만) |

### 💬 댓글 API

| 메서드  | URL                                     | 설명                    | 인증 |
|---------|------------------------------------------|-------------------------|------|
| GET     | `/boards/:boardId/comments`             | 해당 게시글 댓글 전체 조회       | ❌   |
| GET     | `/boards/:boardId/comments/:commentId`  | 특정 댓글 조회               | ❌   |
| POST    | `/boards/:boardId/comments`             | 댓글 작성                  | ✅   |
| PATCH   | `/boards/:boardId/comments/:commentId`  | 댓글 수정 (본인만 가능)        | ✅   |
| DELETE  | `/boards/:boardId/comments/:commentId`  | 댓글 삭제 (본인만 가능)        | ✅   |

### 👍 좋아요 API

| 메서드  | URL               | 설명                    | 인증 |
|---------|-------------------|-------------------------|------|
| GET     | `/boards/:id/likes` | 좋아요 여부 및 총 개수 조회     | ✅   |
| POST    | `/boards/:id/likes` | 좋아요 추가               | ✅   |
| DELETE  | `/boards/:id/likes` | 좋아요 취소               | ✅   |

### 📂 파일 업로드 API

| 메서드  | URL             | 설명                          | 인증 |
|---------|------------------|-------------------------------|------|
| POST    | `/uploads`       | 게시글 첨부파일 업로드 (최대 5개, 25MB) | ✅   |
| DELETE  | `/uploads`       | 게시글 첨부파일 삭제               | ✅   |
| GET     | `/downloads/:filename` | 파일 다운로드                 | ❌   |

### 🧑‍🎨 프로필 이미지 API

| 메서드  | URL                  | 설명                         | 인증 |
|---------|-----------------------|------------------------------|------|
| POST    | `/uploads/profile`    | 프로필 이미지 업로드 (5MB 이하)   | ✅   |
| DELETE  | `/uploads/profile`    | 프로필 이미지 삭제               | ✅   |

### 🍪 쿠키 필터 설정 API

| 메서드  | URL       | 설명                           | 인증 |
|---------|------------|--------------------------------|------|
| POST    | `/cookie`  | 목록 줄 수, 조회수/좋아요 정렬 쿠키 설정 | ❌   |

## [문제 해결]

### 🔸 1. 게시글 삭제 시 무결성 제약 조건 에러 발생

- 게시글을 삭제할 때, 정상적으로 삭제되지 않고 계속 에러 처리가 됐다.
- 에러 로그를 확인해본 결과, `tbl_board` 테이블에서 게시글 데이터를 삭제할 때, 이를 참조하는 `tbl_like` 테이블의 외래 키 제약 조건으로 인해 무결성 제약 조건 에러가 발생했다.
- **해결 방법:** `tbl_like` 테이블의 외래 키에 `ON DELETE CASCADE` 옵션을 추가하여, 게시글 삭제 시 관련 좋아요 데이터도 자동으로 삭제되도록 설정했다.

---

### 🔸 2. 댓글 저장 후 화면에 즉시 표시하는 방식 고민

- 댓글을 등록한 직후, 프론트엔드 화면에 해당 댓글을 바로 표시하기 위한 처리 방식에 대해 고민했다.
  1. 프론트엔드에서 Ajax 요청에 사용한 데이터를 그대로 출력하는 방식  
     - 성능상 유리하고 서버 부하가 적지만, 실제 DB에 저장된 내용과 일치하지 않을 수 있다.
  2. 서버에서 댓글을 저장한 후, select 쿼리로 다시 조회하여 출력하는 방식  
     - 정확한 데이터를 보장하지만, 쿼리를 한 번 더 실행해야 한다.
- **해결 방법:** 정확한 데이터 출력을 우선시하여, 댓글 등록 후 서버에서 저장된 데이터를 다시 조회하여 출력하는 방식으로 구현했다.

---

### 🔸 3. RESTful API 원칙 vs. 단일 라우터 분기 처리

- 특정 라우터 설계를 RESTful하게 나눌지, 하나의 라우터에서 `if` 문으로 요청을 분기할지에 대해 고민했다.  
- 단일 라우터 방식은 직관적이지만 구조가 복잡해지고, RESTful 원칙에서 벗어날 수 있다.  
- **해결 방법:** 기능별로 라우터를 분리하고 RESTful API 설계 원칙을 따르기로 결정하여, 유지보수성과 URI 구조의 명확성을 확보했다.

---

### 🔸 4. 게시글 수정 시 파일 업로드 및 삭제 처리

- 게시글 수정 화면에서 파일을 추가 업로드하는 부분은 간단했지만, 기존 파일 삭제와 함께 처리하는 로직이 복잡해지는 문제가 있었다.  
- 처음에는 삭제된 파일 정보를 임시 배열에 저장한 후, 게시글 저장 시점에 일괄 처리하는 구조를 설계했지만, 전체 로직이 지나치게 복잡해졌다.  
- **해결 방법:** 삭제 버튼(X)을 클릭했을 때 AJAX 요청으로 즉시 파일을 삭제하는 방식으로 변경하여, 복잡한 일괄 처리보다 명확하고 유지보수가 쉬운 구조로 구현했다.

## [추가 구현하고 싶은 기능들]

> 추후 여유가 된다면 구현해보고 싶은 기능입니다.

- 댓글 좋아요 기능
- 댓글 소팅 기능
- 대댓글 기능
- 사용자별 권한 기능
- 이메일 인증을 통한 비밀번호 찾기
- 사용자 기간 제한 밴 기능
