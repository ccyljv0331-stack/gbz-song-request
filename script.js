// ---------------------- 配置 Supabase（替换成你自己的项目信息） ----------------------
const SUPABASE_URL = "https://hnggwexwdkkmezijdkhu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_So2S_wGFu1wLX8TkodX2zg_RF2Skojh";

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 管理员账户信息（固定）
const ADMIN_ACCOUNT = {
  username: "csxinhuagbz",
  password: "20220220"
};

// 全局状态：管理员登录状态（存在浏览器本地，无需存储到云端）
let isAdminLogged = localStorage.getItem("gbz_admin_logged") === "true";

// 初始化页面（页面加载完成后执行）
document.addEventListener("DOMContentLoaded", function() {
  // 引入 Supabase CDN 后，先判断是否加载完成
  if (!window.supabase) {
    showAlert("Supabase 加载失败，请刷新页面重试！", "danger");
    return;
  }

  // 根据当前页面执行对应逻辑
  const currentPage = window.location.pathname.split("/").pop();
  switch (currentPage) {
    case "index.html":
    case "": // 直接打开文件夹默认加载index.html
      renderNowPlaying();
      renderSongRequests();
      bindSongRequestForm();
      break;
    case "admin.html":
      bindAdminLoginForm();
      checkAdminLoginStatus();
      // 管理员已登录的话，渲染数据
      if (isAdminLogged) {
        renderAdminSongRequests();
        renderAdminNowPlaying();
        bindNowPlayingEditForm();
        bindLogoutBtn();
      }
      break;
  }
});

// ---------------------- 学生公开页面相关逻辑 ----------------------
// 渲染当前播放音乐（从 Supabase 读取）
async function renderNowPlaying() {
  try {
    // 从 now_playing 表读取数据（只取第一条，因为只存储 1 条当前播放数据）
    const { data, error } = await supabase
      .from("now_playing")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    // 渲染到页面
    document.getElementById("now-song-name").textContent = data.songName;
    document.getElementById("now-singer").textContent = data.singer;
    document.getElementById("now-platform").textContent = data.platform;
  } catch (error) {
    console.error("读取当前播放音乐失败：", error);
    showAlert("读取当前播放信息失败，请刷新页面！", "danger");
  }
}

// 渲染点歌列表（仅已审核的，从 Supabase 读取）
async function renderSongRequests() {
  try {
    // 从 song_requests 表读取已审核的数据，按提交时间倒序排列
    const { data, error } = await supabase
      .from("song_requests")
      .select("*")
      .eq("approved", true)
      .order("create_time", { ascending: false });

    if (error) throw error;

    const songListEl = document.getElementById("song-list");
    // 清空列表
    songListEl.innerHTML = "";

    // 无数据时提示
    if (!data || data.length === 0) {
      songListEl.innerHTML = '<li class="list-item"><p class="list-item-content">暂无已审核的点歌记录</p></li>';
      return;
    }

    // 渲染已审核的点歌记录
    data.forEach((song) => {
      const listItem = document.createElement("li");
      listItem.className = "list-item";
      listItem.innerHTML = `
        <div class="list-item-content">
          <p class="list-item-title">${song.song_name}</p>
          <p class="list-item-subtitle">歌手：${song.singer} | 平台：${song.platform}</p>
        </div>
      `;
      songListEl.appendChild(listItem);
    });
  } catch (error) {
    console.error("读取点歌列表失败：", error);
    showAlert("读取点歌记录失败，请刷新页面！", "danger");
  }
}

// 绑定点歌表单提交事件（提交到 Supabase）
function bindSongRequestForm() {
  const form = document.getElementById("song-request-form");
  if (!form) return;

  form.addEventListener("submit", async function(e) {
    e.preventDefault(); // 阻止表单默认提交

    // 获取表单数据
    const songName = document.getElementById("song-name").value.trim();
    const singer = document.getElementById("singer").value.trim();
    const platform = document.getElementById("platform").value;

    // 表单验证
    if (!songName || !singer) {
      showAlert("请填写完整歌名和歌手信息！", "danger");
      return;
    }

    // 构造点歌数据（字段名要和 Supabase 表中的字段名一致，小写）
    const newSong = {
      song_name: songName,
      singer: singer,
      platform: platform,
      approved: false, // 默认未审核
      create_time: new Date().toISOString()
    };

    try {
      // 提交数据到 Supabase 的 song_requests 表
      const { error } = await supabase
        .from("song_requests")
        .insert([newSong]);

      if (error) throw error;

      // 重置表单
      form.reset();

      // 显示成功提示
      showAlert("点歌提交成功！等待管理员审核～", "success");
    } catch (error) {
      console.error("提交点歌失败：", error);
      showAlert("点歌提交失败，请刷新页面重试！", "danger");
    }
  });
}

// ---------------------- 管理员页面相关逻辑 ----------------------
// 绑定管理员登录表单提交事件
function bindAdminLoginForm() {
  const loginForm = document.getElementById("admin-login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", function(e) {
    e.preventDefault();

    // 获取登录信息
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    // 验证账户密码
    if (username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password) {
      // 登录成功，保存状态到本地
      isAdminLogged = true;
      localStorage.setItem("gbz_admin_logged", "true");
      // 刷新页面显示管理员操作界面
      window.location.reload();
    } else {
      showAlert("账户或密码错误！请重新输入", "danger");
    }
  });
}

// 检查管理员登录状态，切换页面显示
function checkAdminLoginStatus() {
  const loginSection = document.getElementById("admin-login-section");
  const operationSection = document.getElementById("admin-operation-section");

  if (isAdminLogged) {
    // 已登录：显示操作界面，隐藏登录界面
    loginSection.classList.add("hidden");
    operationSection.classList.remove("hidden");
  } else {
    // 未登录：显示登录界面，隐藏操作界面
    loginSection.classList.remove("hidden");
    operationSection.classList.add("hidden");
  }
}

// 渲染管理员点歌列表（包含未审核，带操作按钮，从 Supabase 读取）
async function renderAdminSongRequests() {
  try {
    // 读取所有点歌记录，按提交时间倒序排列
    const { data, error } = await supabase
      .from("song_requests")
      .select("*")
      .order("create_time", { ascending: false });

    if (error) throw error;

    const adminSongListEl = document.getElementById("admin-song-list");
    // 清空列表
    adminSongListEl.innerHTML = "";

    // 无数据时提示
    if (!data || data.length === 0) {
      adminSongListEl.innerHTML = '<li class="list-item"><p class="list-item-content">暂无点歌记录</p></li>';
      return;
    }

    // 渲染所有点歌记录（含未审核）
    data.forEach((song) => {
      const listItem = document.createElement("li");
      listItem.className = "list-item";
      listItem.innerHTML = `
        <div class="list-item-content">
          <p class="list-item-title">${song.song_name} ${song.approved ? '[已审核]' : '[待审核]'}</p>
          <p class="list-item-subtitle">歌手：${song.singer} | 平台：${song.platform}</p>
          <p class="list-item-subtitle">提交时间：${new Date(song.create_time).toLocaleString()}</p>
        </div>
        <div class="list-item-actions">
          ${!song.approved ? `<button class="btn btn-success btn-sm" onclick="approveSong('${song.id}')">审核通过</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteSong('${song.id}')">删除</button>
        </div>
      `;
      adminSongListEl.appendChild(listItem);
    });
  } catch (error) {
    console.error("读取管理员点歌列表失败：", error);
    showAlert("读取点歌记录失败，请刷新页面！", "danger");
  }
}

// 渲染当前播放音乐（管理员编辑界面，从 Supabase 读取）
async function renderAdminNowPlaying() {
  try {
    const { data, error } = await supabase
      .from("now_playing")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    // 填充到编辑表单
    document.getElementById("edit-song-name").value = data.song_name;
    document.getElementById("edit-singer").value = data.singer;
    document.getElementById("edit-platform").value = data.platform;
  } catch (error) {
    console.error("读取当前播放音乐（管理员）失败：", error);
    showAlert("读取当前播放信息失败，请刷新页面！", "danger");
  }
}

// 绑定当前播放音乐编辑表单提交事件（更新到 Supabase）
function bindNowPlayingEditForm() {
  const editForm = document.getElementById("now-playing-edit-form");
  if (!editForm) return;

  editForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    // 获取编辑后的数据
    const songName = document.getElementById("edit-song-name").value.trim();
    const singer = document.getElementById("edit-singer").value.trim();
    const platform = document.getElementById("edit-platform").value;

    // 表单验证
    if (!songName || !singer) {
      showAlert("请填写完整歌名和歌手信息！", "danger");
      return;
    }

    try {
      // 先获取 now_playing 表中的唯一数据 ID
      const { data: nowPlayingData, error: fetchError } = await supabase
        .from("now_playing")
        .select("id")
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // 更新数据（根据 ID 更新唯一的一条记录）
      const { error: updateError } = await supabase
        .from("now_playing")
        .update({
          song_name: songName,
          singer: singer,
          platform: platform
        })
        .eq("id", nowPlayingData.id);

      if (updateError) throw updateError;

      // 显示成功提示
      showAlert("当前播放音乐修改成功！", "success");

      // 重新渲染（同步页面显示）
      await renderAdminNowPlaying();
      // 同步更新学生端（如果管理员和学生端同时打开）
      await renderNowPlaying();
    } catch (error) {
      console.error("修改当前播放音乐失败：", error);
      showAlert("修改当前播放信息失败，请刷新页面重试！", "danger");
    }
  });
}

// 管理员登出
function bindLogoutBtn() {
  const logoutBtn = document.getElementById("admin-logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function() {
    isAdminLogged = false;
    localStorage.setItem("gbz_admin_logged", "false");
    window.location.reload();
  });
}

// 审核点歌（通过 ID 更新 Supabase 数据）
async function approveSong(songId) {
  try {
    const { error } = await supabase
      .from("song_requests")
      .update({ approved: true })
      .eq("id", songId);

    if (error) throw error;

    // 重新渲染列表
    await renderAdminSongRequests();
    showAlert("点歌审核通过！", "success");
  } catch (error) {
    console.error("审核点歌失败：", error);
    showAlert("审核点歌失败，请刷新页面重试！", "danger");
  }
}

// 删除点歌（通过 ID 从 Supabase 删除数据）
async function deleteSong(songId) {
  if (!confirm("确定要删除这条点歌记录吗？删除后无法恢复！")) {
    return;
  }

  try {
    const { error } = await supabase
      .from("song_requests")
      .delete()
      .eq("id", songId);

    if (error) throw error;

    // 重新渲染列表
    await renderAdminSongRequests();
    showAlert("点歌记录已删除！", "success");
  } catch (error) {
    console.error("删除点歌失败：", error);
    showAlert("删除点歌记录失败，请刷新页面重试！", "danger");
  }
}

// ---------------------- 通用工具函数 ----------------------
// 显示提示框
function showAlert(message, type) {
  // 创建提示框元素
  const alertEl = document.createElement("div");
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;

  // 插入到页面顶部容器
  const container = document.querySelector(".container");
  container.insertBefore(alertEl, container.firstChild);

  // 3秒后自动移除提示框
  setTimeout(() => {
    alertEl.remove();
  }, 3000);
}