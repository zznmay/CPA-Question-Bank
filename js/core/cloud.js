/* CPA 统一题库 · WorkBuddy 云服务接入（客户端初始化 / 登录 / 云端读写） */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});

  // WorkBuddy 云服务 publicConfig（应用创建时由平台返回，仅含端侧公开配置）
  const PUBLIC_CONFIG = {
    endpoint: "https://cpa-question-bank-72411.app.workbuddy.host",
    oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
    publishableKey: "wbpk_YmWnQNON1dzuteE3qXb6iy_wycoXRmhrTtmGiFNbSSEBjEtBC26Vw6p",
  };

  const DATA_TABLE = "cpa_user_data";
  const RESEND_SECONDS = 60;

  let client = null;
  let initError = null;

  function getClient() {
    if (client || initError) return client;
    try {
      if (
        !window.WorkBuddyCloud ||
        typeof window.WorkBuddyCloud.createWorkBuddyCloud !== "function"
      ) {
        initError = "云服务 SDK 未加载";
        return null;
      }
      client = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: PUBLIC_CONFIG.endpoint,
        oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
        publishableKey: PUBLIC_CONFIG.publishableKey,
      });
      return client;
    } catch (e) {
      initError = (e && e.message) || String(e);
      console.warn("[CPA] 云服务初始化失败：", e);
      return null;
    }
  }

  function isAvailable() {
    return !!getClient();
  }

  /* ---------------- 错误分类与重试 ---------------- */

  function isAuthError(e) {
    if (!e) return false;
    const code = String(e.code || "");
    if (/CREDENTIAL|TOKEN|UNAUTHORIZED|PERMISSION/i.test(code)) return true;
    if (e.status === 401 || e.status === 403) return true;
    return /登录状态|重新登录|not authenticated|jwt/i.test(String(e.message || ""));
  }

  function isNetworkError(e) {
    if (!e) return false;
    if (typeof TypeError !== "undefined" && e instanceof TypeError) return true;
    return /network|timeout|failed to fetch|load failed|internet/i.test(
      String((e && e.message) || "")
    );
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function withRetry(fn, attempts) {
    let last = null;
    for (let i = 0; i < attempts; i++) {
      const res = await fn();
      if (res.status !== "error" || !isNetworkError(res.error)) return res;
      last = res;
      if (i < attempts - 1) await delay(800 * (i + 1));
    }
    return last;
  }

  /* ---------------- 认证 ---------------- */

  async function getSession() {
    const c = getClient();
    if (!c) return null;
    try {
      const res = await c.auth.getSession();
      if (res && res.error) return null;
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  async function fetchUser() {
    const session = await getSession();
    if (!session) return null;
    const c = getClient();
    let user = session.user || null;
    if (!user && c && typeof c.auth.getUser === "function") {
      try {
        const res = await c.auth.getUser();
        user = (res && res.data && res.data.user) || (res && res.data) || null;
      } catch (e) {
        user = null;
      }
    }
    return user;
  }

  function maskPhone(phone) {
    const p = String(phone || "");
    return /^1\d{10}$/.test(p) ? p.slice(0, 3) + "****" + p.slice(7) : "已登录用户";
  }

  async function sendOtp(phone) {
    const c = getClient();
    if (!c) return { error: new Error("云服务不可用，请检查网络后重试") };
    try {
      const res = await c.auth.sendOtp({ phone: phone });
      if (res && res.error) return { error: res.error };
      return { data: res.data };
    } catch (e) {
      return { error: e };
    }
  }

  async function verifyOtp(payload) {
    const c = getClient();
    if (!c) return { error: new Error("云服务不可用，请检查网络后重试") };
    try {
      const res = await c.auth.verifyOtp(payload);
      if (res && res.error) return { error: res.error };
      return { data: res.data };
    } catch (e) {
      return { error: e };
    }
  }

  async function signOut() {
    const c = getClient();
    if (!c) return;
    try {
      await c.auth.signOut();
    } catch (e) {
      console.warn("[CPA] 退出登录失败：", e);
    }
  }

  function onAuthStateChange(cb) {
    const c = getClient();
    if (!c || !c.auth || typeof c.auth.onAuthStateChange !== "function") return;
    try {
      c.auth.onAuthStateChange(cb);
    } catch (e) {
      console.warn("[CPA] 注册登录状态监听失败：", e);
    }
  }

  /* ---------------- 云端数据读写（每用户一行整包 JSON） ---------------- */

  async function pullRemote() {
    const c = getClient();
    const session = await getSession();
    if (!c || !session) return { status: "signed-out" };
    const run = async function () {
      try {
        const res = await c.database
          .from(DATA_TABLE)
          .select("data, updated_at")
          .limit(1);
        if (res && res.error) throw res.error;
        const rows = (res && res.data) || [];
        return { status: "ok", row: rows.length ? rows[0] : null };
      } catch (e) {
        return { status: isAuthError(e) ? "auth" : "error", error: e };
      }
    };
    return withRetry(run, 3);
  }

  async function pushRemote(payload) {
    const c = getClient();
    const session = await getSession();
    if (!c || !session) return { status: "signed-out" };
    const run = async function () {
      try {
        const res = await c.database
          .from(DATA_TABLE)
          .upsert({ data: payload }, { onConflict: "owner_id" })
          .select("id, updated_at");
        if (res && res.error) throw res.error;
        const rows = (res && res.data) || [];
        if (!rows.length) {
          return { status: "error", error: new Error("云端写入被拒绝（权限不足）") };
        }
        return { status: "ok", row: rows[0] };
      } catch (e) {
        return { status: isAuthError(e) ? "auth" : "error", error: e };
      }
    };
    return withRetry(run, 3);
  }

  /* ---------------- 登录弹窗（手机号验证码） ---------------- */

  let authModalEl = null;
  let pendingOtp = null;
  let resendTimer = null;
  let resendLeft = 0;

  function closeAuthModal() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    if (!authModalEl) return;
    document.removeEventListener("keydown", escCloseAuth);
    authModalEl.remove();
    authModalEl = null;
    document.body.classList.remove("modal-open");
  }

  function escCloseAuth(e) {
    if (e.key === "Escape") closeAuthModal();
  }

  function setFieldError(input, message) {
    const err = authModalEl && authModalEl.querySelector('[data-error-for="' + input + '"]');
    if (err) err.textContent = message || "";
  }

  function setFormError(message) {
    const err = authModalEl && authModalEl.querySelector("[data-form-error]");
    if (err) err.textContent = message || "";
  }

  function startResendCountdown() {
    const btn = authModalEl && authModalEl.querySelector("[data-send-code]");
    if (!btn) return;
    resendLeft = RESEND_SECONDS;
    btn.disabled = true;
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = setInterval(function () {
      resendLeft -= 1;
      if (resendLeft <= 0) {
        clearInterval(resendTimer);
        resendTimer = null;
        btn.disabled = false;
        btn.textContent = "重新获取";
      } else {
        btn.textContent = resendLeft + "s 后重发";
      }
    }, 1000);
    btn.textContent = RESEND_SECONDS + "s 后重发";
  }

  async function handleSendCode() {
    if (!authModalEl) return;
    const phoneInput = authModalEl.querySelector("[data-phone]");
    const btn = authModalEl.querySelector("[data-send-code]");
    const phone = (phoneInput.value || "").trim();
    setFieldError("phone", "");
    setFormError("");
    if (!/^1\d{10}$/.test(phone)) {
      setFieldError("phone", "请输入正确的 11 位手机号");
      return;
    }
    btn.disabled = true;
    btn.textContent = "发送中…";
    const res = await sendOtp(phone);
    if (res.error) {
      setFormError((res.error && res.error.message) || "验证码发送失败，请稍后重试");
      btn.disabled = false;
      btn.textContent = "获取验证码";
      return;
    }
    // 保存发送结果，登录时使用同一 challenge（发送与校验分离，避免重复发码）
    pendingOtp = {
      phone: phone,
      verificationId: res.data && res.data.verificationId,
      isExistingUser: !!(res.data && res.data.isExistingUser),
    };
    authModalEl.querySelector("[data-code]").focus();
    setFormError("");
    const hint = authModalEl.querySelector("[data-sent-hint]");
    if (hint) hint.textContent = "验证码已发送至 " + maskPhone(phone);
    startResendCountdown();
  }

  async function handleSubmit() {
    if (!authModalEl) return;
    const phoneInput = authModalEl.querySelector("[data-phone]");
    const codeInput = authModalEl.querySelector("[data-code]");
    const submitBtn = authModalEl.querySelector("[data-submit]");
    const phone = (phoneInput.value || "").trim();
    const token = (codeInput.value || "").trim();
    setFieldError("phone", "");
    setFieldError("code", "");
    setFormError("");
    if (!/^1\d{10}$/.test(phone)) {
      setFieldError("phone", "请输入正确的 11 位手机号");
      return;
    }
    if (!pendingOtp || pendingOtp.phone !== phone) {
      setFormError("请先获取当前手机号的验证码");
      return;
    }
    if (!token) {
      setFieldError("code", "请输入验证码");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "登录中…";
    const res = await verifyOtp({
      phone: pendingOtp.phone,
      verificationId: pendingOtp.verificationId,
      isExistingUser: pendingOtp.isExistingUser,
      token: token,
    });
    if (res.error) {
      // 校验失败不重新发码，可修改验证码后重试
      setFormError((res.error && res.error.message) || "验证码校验失败，请确认后重试");
      submitBtn.disabled = false;
      submitBtn.textContent = "登录";
      return;
    }
    pendingOtp = null;
    closeAuthModal();
    const user = (res.data && res.data.user) || null;
    if (CPA.store && typeof CPA.store.handleSignedIn === "function") {
      CPA.store.handleSignedIn(user);
    }
    if (CPA.utils && CPA.utils.toast) {
      CPA.utils.toast("登录成功，学习数据已接入云端同步", "success", 3200);
    }
  }

  function openLoginModal() {
    if (authModalEl) return;
    if (!isAvailable()) {
      if (CPA.utils && CPA.utils.toast) {
        CPA.utils.toast("云服务组件未加载，当前仅支持本机存储。", "error", 3600);
      }
      return;
    }
    const U = CPA.utils;
    authModalEl = document.createElement("div");
    authModalEl.className = "modal-backdrop";
    authModalEl.innerHTML =
      '<div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">' +
      '  <div class="modal-head">' +
      '    <div><h2 id="authModalTitle">登录云题库</h2><p>使用手机号验证码登录，学习数据云端保存、多设备同步。</p></div>' +
      '    <button class="icon-btn" type="button" data-close aria-label="关闭">×</button>' +
      "  </div>" +
      '  <div class="modal-body">' +
      '    <div class="auth-form">' +
      '      <div class="auth-field">' +
      '        <label for="authPhone">手机号</label>' +
      '        <div class="auth-row">' +
      '          <input class="auth-input" id="authPhone" data-phone type="tel" maxlength="11" inputmode="numeric" autocomplete="tel" placeholder="请输入 11 位手机号" />' +
      '          <button class="btn btn-ghost btn-sm auth-code-btn" type="button" data-send-code>获取验证码</button>' +
      "        </div>" +
      '        <p class="auth-error" data-error-for="phone"></p>' +
      "      </div>" +
      '      <div class="auth-field">' +
      '        <label for="authCode">验证码</label>' +
      '        <input class="auth-input" id="authCode" data-code type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="请输入短信验证码" />' +
      '        <p class="auth-error" data-error-for="code"></p>' +
      "      </div>" +
      '      <p class="auth-hint" data-sent-hint></p>' +
      '      <p class="auth-error" data-form-error></p>' +
      '      <button class="btn btn-primary auth-submit" type="button" data-submit>登录</button>' +
      '      <p class="auth-tip">新手机号将自动注册；登录后本机已有进度会自动合并到云端。</p>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(authModalEl);
    document.body.classList.add("modal-open");

    authModalEl.addEventListener("click", function (e) {
      if (e.target === authModalEl) closeAuthModal();
      if (e.target.closest("[data-close]")) closeAuthModal();
    });
    document.addEventListener("keydown", escCloseAuth);

    authModalEl.querySelector("[data-send-code]").addEventListener("click", handleSendCode);
    authModalEl.querySelector("[data-submit]").addEventListener("click", handleSubmit);
    authModalEl.querySelector("[data-code]").addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSubmit();
    });
    authModalEl.querySelector("[data-phone]").addEventListener("input", function () {
      setFieldError("phone", "");
    });
    authModalEl.querySelector("[data-code]").addEventListener("input", function () {
      setFieldError("code", "");
      setFormError("");
    });
    if (U && U.$) U.$("[data-phone]", authModalEl).focus();
  }

  CPA.cloud = {
    isAvailable: isAvailable,
    getSession: getSession,
    fetchUser: fetchUser,
    maskPhone: maskPhone,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    signOut: signOut,
    onAuthStateChange: onAuthStateChange,
    pullRemote: pullRemote,
    pushRemote: pushRemote,
    openLoginModal: openLoginModal,
    closeAuthModal: closeAuthModal,
  };
})();
