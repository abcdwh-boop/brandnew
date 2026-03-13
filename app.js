// 간단한 중고물품 나눔 SPA (localStorage 사용)

const PASSWORD = "1234"; // 필요하면 나중에 변경
const STORAGE_KEYS = {
  user: "share_app_user",
  posts: "share_app_posts",
};

const TABS = {
  ALL: "ALL",
  MY_POSTS: "MY_POSTS",
  MY_COMMENTS: "MY_COMMENTS",
  MY_LIKES: "MY_LIKES",
};

const STATUS = {
  ACTIVE: "나눔중",
  RESERVED: "예약중",
  DONE: "나눔완료",
};

const CATEGORIES = ["생활용품", "학급물품", "수업용품", "기타"];

let state = {
  screen: "LOGIN", // LOGIN | MAIN | FORM
  user: null,
  posts: [],
  activeTab: TABS.ALL,
  editingPostId: null,
  loginError: "",
};

function loadState() {
  try {
    const userRaw = localStorage.getItem(STORAGE_KEYS.user);
    const postsRaw = localStorage.getItem(STORAGE_KEYS.posts);
    if (userRaw) {
      state.user = JSON.parse(userRaw);
    }
    if (postsRaw) {
      state.posts = JSON.parse(postsRaw);
    }
    if (state.user) {
      state.screen = "MAIN";
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
}

function saveState() {
  try {
    if (state.user) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
    }
    localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(state.posts));
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  const attrs = props || {};
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") {
      node.className = value;
    } else if (key === "onClick") {
      node.addEventListener("click", value);
    } else if (key === "onSubmit") {
      node.addEventListener("submit", value);
    } else if (key === "for") {
      node.htmlFor = value;
    } else if (key === "value") {
      node.value = value;
    } else if (key === "type") {
      node.type = value;
    } else if (key === "placeholder") {
      node.placeholder = value;
    } else if (key === "id") {
      node.id = value;
    } else if (key === "disabled") {
      node.disabled = !!value;
    } else if (key.startsWith("data-")) {
      node.setAttribute(key, value);
    } else {
      node.setAttribute(key, value);
    }
  });
  children.flat().forEach((child) => {
    if (child == null || child === false) return;
    if (typeof child === "string") {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  });
  return node;
}

function setScreen(next) {
  state.screen = next;
  if (next !== "FORM") {
    state.editingPostId = null;
  }
  render();
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const pw = e.target.elements.password.value.trim();
  const name = e.target.elements.name.value.trim();
  if (!pw || !name) {
    state.loginError = "비밀번호와 이름을 모두 입력해주세요.";
    render();
    return;
  }
  if (pw !== PASSWORD) {
    state.loginError = "비밀번호가 올바르지 않습니다.";
    render();
    return;
  }
  if (!state.user) {
    state.user = {
      id: generateId(),
      name,
      createdAt: Date.now(),
    };
  } else {
    state.user.name = name;
  }
  state.loginError = "";
  saveState();
  setScreen("MAIN");
}

function handleLogout() {
  // 유저 정보는 남겨두고, 단지 로그인 화면으로 이동
  setScreen("LOGIN");
}

function createPostObj(formValues) {
  const now = Date.now();
  return {
    id: generateId(),
    title: formValues.title,
    description: formValues.description,
    status: formValues.status,
    category: formValues.category,
    imageDataUrl: formValues.imageDataUrl || "",
    createdAt: now,
    updatedAt: now,
    authorId: state.user.id,
    authorName: state.user.name,
    likes: [],
    comments: [],
  };
}

function handlePostFormSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const title = (fd.get("title") || "").toString().trim();
  const description = (fd.get("description") || "").toString().trim();
  const status = (fd.get("status") || STATUS.ACTIVE).toString();
  const category = (fd.get("category") || CATEGORIES[0]).toString();
  const file = e.target.elements.image.files[0];

  if (!title) {
    alert("제목을 입력해주세요.");
    return;
  }

  const afterImageReady = (imageDataUrl) => {
    if (state.editingPostId) {
      const idx = state.posts.findIndex((p) => p.id === state.editingPostId);
      if (idx === -1) return;
      const existing = state.posts[idx];
      if (existing.authorId !== state.user.id) {
        alert("내가 올린 글만 수정할 수 있습니다.");
        return;
      }
      state.posts[idx] = {
        ...existing,
        title,
        description,
        status,
        category,
        imageDataUrl: imageDataUrl != null ? imageDataUrl : existing.imageDataUrl,
        updatedAt: Date.now(),
      };
    } else {
      const post = createPostObj({
        title,
        description,
        status,
        category,
        imageDataUrl,
      });
      state.posts.unshift(post);
    }
    saveState();
    setScreen("MAIN");
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      afterImageReady(reader.result.toString());
    };
    reader.readAsDataURL(file);
  } else {
    afterImageReady(null);
  }
}

function handleLike(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post || !state.user) return;
  const liked = post.likes.includes(state.user.id);
  post.likes = liked
    ? post.likes.filter((id) => id !== state.user.id)
    : [...post.likes, state.user.id];
  saveState();
  render();
}

function handleCommentSubmit(postId, inputEl) {
  const text = inputEl.value.trim();
  if (!text) return;
  const post = state.posts.find((p) => p.id === postId);
  if (!post || !state.user) return;
  post.comments.push({
    id: generateId(),
    authorId: state.user.id,
    authorName: state.user.name,
    body: text,
    createdAt: Date.now(),
  });
  inputEl.value = "";
  saveState();
  render();
}

function handleEditPost(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  if (post.authorId !== state.user.id) {
    alert("내가 올린 글만 수정할 수 있습니다.");
    return;
  }
  state.editingPostId = postId;
  setScreen("FORM");
}

function handleDeletePost(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  if (post.authorId !== state.user.id) {
    alert("내가 올린 글만 삭제할 수 있습니다.");
    return;
  }
  if (!confirm("정말로 이 게시물을 삭제할까요?")) return;
  state.posts = state.posts.filter((p) => p.id !== postId);
  saveState();
  render();
}

function filterPostsForTab() {
  const userId = state.user ? state.user.id : null;
  switch (state.activeTab) {
    case TABS.MY_POSTS:
      return state.posts.filter((p) => p.authorId === userId);
    case TABS.MY_COMMENTS:
      return state.posts.filter((p) =>
        p.comments && p.comments.some((c) => c.authorId === userId)
      );
    case TABS.MY_LIKES:
      return state.posts.filter((p) => p.likes && p.likes.includes(userId));
    case TABS.ALL:
    default:
      return state.posts;
  }
}

function renderLogin() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const existingName = state.user ? state.user.name : "";

  const form = el(
    "form",
    { onSubmit: handleLoginSubmit },
    el("div", { class: "form-group" }, [
      el("label", { for: "password" }, "입장 비밀번호"),
      el("input", {
        id: "password",
        name: "password",
        type: "password",
        class: "input",
        placeholder: "예: 1234",
      }),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "name" }, "이름"),
      el("input", {
        id: "name",
        name: "name",
        type: "text",
        class: "input",
        placeholder: "이름을 입력하세요",
        value: existingName,
      }),
      el(
        "small",
        null,
        "처음 한 번만 저장되며, 다음부터는 다시 입력하지 않아도 됩니다."
      ),
    ]),
    state.loginError
      ? el("div", { class: "error-text" }, state.loginError)
      : null,
    el(
      "button",
      { type: "submit", class: "btn btn-primary", style: "margin-top: 8px;" },
      "입장하기"
    )
  );

  const card = el(
    "div",
    { class: "login-card" },
    el("h1", null, "중고물품 나눔방"),
    el(
      "p",
      null,
      "비밀번호와 이름을 입력하면 나눔방으로 입장합니다. 같은 비밀번호를 아는 사람들끼리만 사용할 수 있어요."
    ),
    form
  );

  const wrap = el("div", { class: "login-wrap" }, card);
  app.appendChild(wrap);
}

function renderHeader() {
  return el(
    "header",
    { class: "app-header" },
    el(
      "div",
      { class: "app-header-title" },
      el("h1", null, "중고물품 나눔"),
      el("span", null, "우리 반 / 모임을 위한 작은 나눔장터")
    ),
    el(
      "div",
      null,
      el(
        "div",
        { class: "user-chip" },
        el("span", { class: "dot" }),
        el("span", null, state.user ? state.user.name : "익명"),
        el(
          "button",
          {
            type: "button",
            class: "btn btn-ghost btn-sm",
            onClick: handleLogout,
          },
          "나가기"
        )
      )
    )
  );
}

function renderTopRow() {
  const subtitle =
    state.activeTab === TABS.ALL
      ? "전체 게시물"
      : state.activeTab === TABS.MY_POSTS
      ? "내가 올린 글"
      : state.activeTab === TABS.MY_COMMENTS
      ? "내가 댓글 단 글"
      : "내가 찜한 물건";
  return el(
    "div",
    { class: "top-row" },
    el("span", { class: "title" }, subtitle),
    el("span", { class: "sub" }, `${state.posts.length}개의 게시물`)
  );
}

function renderToolbar() {
  const onNew = () => {
    state.editingPostId = null;
    setScreen("FORM");
  };
  return el(
    "div",
    { class: "toolbar" },
    el(
      "button",
      { class: "btn btn-primary", type: "button", onClick: onNew },
      "＋ 게시물 올리기"
    ),
    el(
      "button",
      {
        class: "btn btn-outline btn-sm",
        type: "button",
        onClick: () => {
          state.activeTab = TABS.MY_POSTS;
          render();
        },
      },
      "내가 올린 글 보기"
    )
  );
}

function makeStatusBadge(status) {
  let cls = "badge";
  if (status === STATUS.ACTIVE) cls += " badge-status-active";
  else if (status === STATUS.RESERVED) cls += " badge-status-reserved";
  else cls += " badge-status-done";
  return el("span", { class: cls }, status);
}

function renderCard(post) {
  const isMine = state.user && post.authorId === state.user.id;
  const liked = state.user ? post.likes.includes(state.user.id) : false;
  const hasComments = post.comments.length > 0;

  const commentInputId = `c-${post.id}`;

  const onCommentSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.comment;
    handleCommentSubmit(post.id, input);
  };

  return el(
    "article",
    { class: "card" },
    el(
      "div",
      { class: "card-thumb" },
      post.imageDataUrl
        ? el("img", { src: post.imageDataUrl, alt: post.title })
        : "사진 없음"
    ),
    el(
      "div",
      { class: "card-main" },
      el(
        "div",
        { class: "card-header-row" },
        el("div", null, [
          el("div", { class: "card-title" }, post.title),
          el("div", { class: "card-author" }, `올린 사람: ${post.authorName}`),
        ]),
        el(
          "div",
          null,
          makeStatusBadge(post.status),
          " ",
          el(
            "span",
            { class: "badge badge-category", style: "margin-left:4px;" },
            post.category
          )
        )
      ),
      el(
        "div",
        { class: "card-meta-row" },
        el(
          "span",
          { class: "meta-small" },
          `게시일 ${formatDate(post.createdAt)}`
        ),
        el(
          "span",
          { class: "pill" },
          el("span", {
            class: `pill-dot ${post.status === STATUS.DONE ? "pill-dot-gray" : "pill-dot-green"}`,
          }),
          post.status === STATUS.DONE ? "나눔완료" : "나눔중/예약중"
        ),
        hasComments
          ? el("span", { class: "meta-small" }, `댓글 ${post.comments.length}개`)
          : null
      ),
      post.description
        ? el(
            "div",
            { style: "margin-top:4px;font-size:12px;color:#4b5563;" },
            post.description
          )
        : null,
      el(
        "div",
        { class: "card-footer-row" },
        el(
          "div",
          { class: "card-actions" },
          el(
            "button",
            {
              type: "button",
              class: "btn btn-ghost btn-sm",
              onClick: () => handleLike(post.id),
            },
            liked ? "♡ 취소" : "♡ 찜하기",
            ` (${post.likes.length})`
          ),
          !isMine
            ? el(
                "button",
                {
                  type: "button",
                  class: "btn btn-ghost btn-sm",
                  onClick: () => {
                    const input = document.getElementById(commentInputId);
                    if (input) input.focus();
                  },
                },
                hasComments ? "댓글 보기/쓰기" : "댓글 쓰기"
              )
            : null
        ),
        isMine
          ? el(
              "div",
              { class: "card-actions" },
              el(
                "button",
                {
                  type: "button",
                  class: "btn btn-outline btn-sm",
                  onClick: () => handleEditPost(post.id),
                },
                "수정"
              ),
              el(
                "button",
                {
                  type: "button",
                  class: "btn btn-outline btn-sm",
                  onClick: () => handleDeletePost(post.id),
                },
                "삭제"
              )
            )
          : null
      ),
      !isMine
        ? el(
            "div",
            null,
            post.comments.length
              ? el(
                  "ul",
                  { class: "comment-list" },
                  post.comments.map((c) =>
                    el(
                      "li",
                      { class: "comment-item" },
                      el(
                        "div",
                        { class: "comment-meta" },
                        `${c.authorName} · ${formatDate(c.createdAt)}`
                      ),
                      el("div", { class: "comment-body" }, c.body)
                    )
                  )
                )
              : null,
            el(
              "form",
              { class: "comment-form", onSubmit: onCommentSubmit },
              el("label", { for: commentInputId, class: "sr-only" }, "댓글"),
              el("input", {
                id: commentInputId,
                name: "comment",
                type: "text",
                class: "input",
                placeholder: "댓글을 입력하세요",
              }),
              el(
                "button",
                { type: "submit", class: "btn btn-primary btn-sm" },
                "등록"
              )
            )
          )
        : null
    )
  );
}

function renderList() {
  const posts = filterPostsForTab();
  if (!posts.length) {
    return el(
      "div",
      { class: "empty-state" },
      "아직 해당되는 게시물이 없습니다.",
      el(
        "div",
        null,
        el(
          "button",
          {
            type: "button",
            class: "btn btn-primary btn-sm",
            onClick: () => {
              state.editingPostId = null;
              setScreen("FORM");
            },
          },
          "첫 글 올리기"
        )
      )
    );
  }
  return el(
    "div",
    { class: "list" },
    posts.map((p) => renderCard(p))
  );
}

function renderTabs() {
  const makeTab = (tabKey, label) =>
    el(
      "button",
      {
        type: "button",
        class:
          "tab-btn " +
          (state.activeTab === tabKey ? "tab-btn-active" : ""),
        onClick: () => {
          state.activeTab = tabKey;
          render();
        },
      },
      el("span", null, label)
    );

  return el(
    "nav",
    { class: "bottom-nav" },
    el(
      "div",
      { class: "tab-row" },
      makeTab(TABS.ALL, "전체"),
      makeTab(TABS.MY_POSTS, "내가 올린 글"),
      makeTab(TABS.MY_COMMENTS, "내가 단 댓글"),
      makeTab(TABS.MY_LIKES, "내가 찜한 물건")
    )
  );
}

function renderMain() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const shell = el(
    "div",
    { class: "shell" },
    renderHeader(),
    renderTopRow(),
    renderToolbar(),
    el("main", { class: "content" }, renderList(), renderTabs())
  );
  app.appendChild(shell);
}

function renderForm() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const editing = state.posts.find((p) => p.id === state.editingPostId);

  const onCancel = () => {
    setScreen("MAIN");
  };

  const statusChips = Object.values(STATUS).map((st) =>
    el(
      "button",
      {
        type: "button",
        class:
          "chip " +
          ((editing && editing.status === st) || (!editing && STATUS.ACTIVE === st)
            ? "chip-active"
            : ""),
        onClick: () => {
          const select = document.getElementById("status");
          if (select) {
            select.value = st;
          }
        },
      },
      st
    )
  );

  const categoryChips = CATEGORIES.map((cat) =>
    el(
      "button",
      {
        type: "button",
        class:
          "chip " +
          ((editing && editing.category === cat) ||
          (!editing && CATEGORIES[0] === cat)
            ? "chip-active"
            : ""),
        onClick: () => {
          const select = document.getElementById("category");
          if (select) {
            select.value = cat;
          }
        },
      },
      cat
    )
  );

  const form = el(
    "form",
    { onSubmit: handlePostFormSubmit },
    el("div", { class: "form-group" }, [
      el("label", { for: "title" }, "제목"),
      el("input", {
        id: "title",
        name: "title",
        type: "text",
        class: "input",
        placeholder: "예: 국어 교과서, 안 쓰는 필통 나눔합니다.",
      }),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "image" }, "사진 첨부"),
      el("input", {
        id: "image",
        name: "image",
        type: "file",
        accept: "image/*",
        class: "input",
      }),
      el(
        "small",
        null,
        "사진을 선택하지 않아도 글을 올릴 수 있습니다."
      ),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "description" }, "간단한 설명"),
      el(
        "textarea",
        {
          id: "description",
          name: "description",
          class: "textarea",
          placeholder: "물건 상태, 사용감, 필요한 사람 등을 간단히 적어주세요.",
        }
      ),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "status" }, "상태 (나눔중 / 예약중 / 나눔완료)"),
      el(
        "select",
        { id: "status", name: "status", class: "select" },
        Object.values(STATUS).map((st) =>
          el(
            "option",
            {
              value: st,
              selected: (editing ? editing.status : STATUS.ACTIVE) === st,
            },
            st
          )
        )
      ),
      el("div", { class: "chip-row", style: "margin-top:6px;" }, statusChips),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "category" }, "구분"),
      el(
        "select",
        { id: "category", name: "category", class: "select" },
        CATEGORIES.map((cat, idx) =>
          el(
            "option",
            {
              value: cat,
              selected:
                (editing && editing.category === cat) ||
                (!editing && !idx),
            },
            cat
          )
        )
      ),
      el(
        "div",
        { class: "chip-row", style: "margin-top:6px;" },
        categoryChips
      ),
    ]),
    el("div", { class: "form-group" }, [
      el("label", null, "작성자"),
      el(
        "div",
        { class: "pill" },
        state.user ? state.user.name : "알 수 없음",
        " (자동 등록)"
      ),
    ]),
    el(
      "div",
      { style: "display:flex; gap:8px; margin-top:10px;" },
      el(
        "button",
        { type: "submit", class: "btn btn-primary", style: "flex:1;" },
        editing ? "수정 완료" : "게시물 올리기"
      ),
      el(
        "button",
        {
          type: "button",
          class: "btn btn-outline",
          style: "flex:1;",
          onClick: onCancel,
        },
        "취소"
      )
    )
  );

  const shell = el(
    "div",
    { class: "shell" },
    renderHeader(),
    el(
      "div",
      { class: "top-row" },
      el("span", { class: "title" }, editing ? "게시물 수정" : "새 게시물"),
      el(
        "span",
        { class: "sub" },
        "제목, 사진, 설명, 상태, 구분을 입력해주세요."
      )
    ),
    el("main", { class: "content form-wrap" }, form)
  );
  app.appendChild(shell);
}

function render() {
  if (!state.user || state.screen === "LOGIN") {
    renderLogin();
  } else if (state.screen === "FORM") {
    renderForm();
  } else {
    renderMain();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadState();
  render();
});

