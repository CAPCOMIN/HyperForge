"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type {
  InviteCode,
  SessionUser,
  TaskRun,
  UserAccount,
  UserQuotaSnapshot,
  UserRole,
  UserStatus
} from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

type ManagedUser = UserAccount & {
  quota: UserQuotaSnapshot | null;
};

export function AdminConsole({
  sessionUser,
  users,
  settings,
  inviteCodes,
  recentRuns
}: {
  sessionUser: SessionUser;
  users: ManagedUser[];
  settings: {
    minimaxApiKey: string | null;
    evomapApiKey: string | null;
    evomapNodeId: string | null;
    evomapNodeSecret: string | null;
  };
  inviteCodes: InviteCode[];
  recentRuns: TaskRun[];
}) {
  const { formatDateTime } = useLocale();
  const [managedUsers, setManagedUsers] = useState(users);
  const [managedSettings, setManagedSettings] = useState(settings);
  const [managedInvites, setManagedInvites] = useState(inviteCodes);
  const [createForm, setCreateForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "user",
    quotaLimit: "5"
  });
  const [settingsForm, setSettingsForm] = useState({
    minimaxApiKey: managedSettings.minimaxApiKey ?? "",
    evomapApiKey: managedSettings.evomapApiKey ?? "",
    evomapNodeId: managedSettings.evomapNodeId ?? "",
    evomapNodeSecret: managedSettings.evomapNodeSecret ?? ""
  });
  const [inviteForm, setInviteForm] = useState({
    note: "",
    maxUses: "1"
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const stats = useMemo(
    () => ({
      users: managedUsers.length,
      admins: managedUsers.filter((user) => user.role === "admin").length,
      disabled: managedUsers.filter((user) => user.status === "disabled").length,
      runs: recentRuns.length
    }),
    [managedUsers, recentRuns.length]
  );

  async function createUser() {
    setFeedback(null);
    setBusyKey("create-user");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: createForm.username,
          displayName: createForm.displayName,
          password: createForm.password,
          role: createForm.role,
          quotaLimit: createForm.role === "admin" ? null : Number(createForm.quotaLimit || 5)
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { user?: UserAccount; quota?: UserQuotaSnapshot | null }
        | null;

      if (!response.ok || !payload?.user) {
        setFeedback({ tone: "error", message: "创建账户失败。" });
        return;
      }

      setManagedUsers((current) => [
        {
          ...payload.user!,
          quota: payload.quota ?? {
            used: 0,
            limit: payload.user!.role === "admin" ? null : payload.user!.quotaLimit ?? 5,
            remaining: payload.user!.role === "admin" ? null : payload.user!.quotaLimit ?? 5
          }
        },
        ...current
      ]);
      setCreateForm({
        username: "",
        displayName: "",
        password: "",
        role: "user",
        quotaLimit: "5"
      });
      setFeedback({ tone: "success", message: "账户创建成功。" });
    } catch {
      setFeedback({ tone: "error", message: "创建账户失败。" });
    } finally {
      setBusyKey(null);
    }
  }

  async function saveSettings() {
    setFeedback(null);
    setBusyKey("settings");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });

      const payload = (await response.json().catch(() => null)) as
        | { settings?: typeof settings }
        | null;

      if (!response.ok || !payload?.settings) {
        setFeedback({ tone: "error", message: "保存平台连接设置失败。" });
        return;
      }

      setManagedSettings(payload.settings);
      setSettingsForm({
        minimaxApiKey: payload.settings.minimaxApiKey ?? "",
        evomapApiKey: payload.settings.evomapApiKey ?? "",
        evomapNodeId: payload.settings.evomapNodeId ?? "",
        evomapNodeSecret: payload.settings.evomapNodeSecret ?? ""
      });
      setFeedback({ tone: "success", message: "平台连接设置已更新。" });
    } catch {
      setFeedback({ tone: "error", message: "保存平台连接设置失败。" });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateUser(
    userId: string,
    payload: Record<string, unknown>
  ) {
    setFeedback(null);
    setBusyKey(`user:${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as
        | { user?: UserAccount | null; quota?: UserQuotaSnapshot | null }
        | null;

      if (!response.ok || !data?.user) {
        setFeedback({ tone: "error", message: "用户更新失败。" });
        return;
      }

      setManagedUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...data.user!,
                quota: data.quota ?? user.quota
              }
            : user
        )
      );
      setFeedback({ tone: "success", message: "账户已保存。" });
    } catch {
      setFeedback({ tone: "error", message: "用户更新失败。" });
    } finally {
      setBusyKey(null);
    }
  }

  async function createInviteCode() {
    setFeedback(null);
    setBusyKey("invite:create");
    try {
      const response = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: inviteForm.note || null,
          maxUses: Number(inviteForm.maxUses || 1)
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { inviteCode?: InviteCode }
        | null;

      if (!response.ok || !payload?.inviteCode) {
        setFeedback({ tone: "error", message: "邀请码生成失败。" });
        return;
      }

      setManagedInvites((current) => [payload.inviteCode!, ...current]);
      setInviteForm({ note: "", maxUses: "1" });
      setFeedback({ tone: "success", message: "邀请码已生成。" });
    } catch {
      setFeedback({ tone: "error", message: "邀请码生成失败。" });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateInviteCode(inviteId: string, payload: Record<string, unknown>) {
    setFeedback(null);
    setBusyKey(`invite:${inviteId}`);
    try {
      const response = await fetch(`/api/admin/invite-codes/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as
        | { inviteCode?: InviteCode | null }
        | null;

      if (!response.ok || !data?.inviteCode) {
        setFeedback({ tone: "error", message: "邀请码更新失败。" });
        return;
      }

      setManagedInvites((current) =>
        current.map((invite) => (invite.id === inviteId ? data.inviteCode! : invite))
      );
      setFeedback({ tone: "success", message: "邀请码已更新。" });
    } catch {
      setFeedback({ tone: "error", message: "邀请码更新失败。" });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              管理后台
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-steel">
              管理用户、额度、平台密钥和全局会话。当前管理员：{sessionUser.displayName}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            查看任务总览
          </Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            ["账户数", stats.users],
            ["管理员", stats.admins],
            ["已禁用", stats.disabled],
            ["近期会话", stats.runs]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-medium text-steel">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {feedback ? (
        <section
          className={cn(
            "rounded-2xl border px-5 py-4 text-sm shadow-[0_18px_50px_rgba(15,23,42,0.06)]",
            feedback.tone === "success"
              ? "border-success/20 bg-success/5 text-success"
              : "border-warning/20 bg-warning/5 text-warning"
          )}
        >
          {feedback.message}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <section className="space-y-4">
          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">用户与权限</h2>
                <p className="mt-1 text-sm text-steel">
                  设置角色、禁用状态、额度和密码重置。
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {managedUsers.map((user) => (
                <UserAdminCard
                  key={user.id}
                  user={user}
                  isSelf={user.id === sessionUser.id}
                  busy={busyKey === `user:${user.id}`}
                  onSave={updateUser}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold tracking-tight">最近会话</h2>
            <p className="mt-1 text-sm text-steel">管理员可查看任意用户的最近对话。</p>
            <div className="mt-5 space-y-3">
              {recentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="grid gap-3 rounded-2xl border border-line/70 bg-[#f9fbfd] p-4 transition hover:border-accent/30 hover:bg-white md:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] text-steel">
                        {run.ownerDisplayName ?? run.ownerUsername ?? "Unknown"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]",
                          run.status === "completed"
                            ? "bg-success/10 text-success"
                            : run.status === "failed"
                              ? "bg-warning/10 text-warning"
                              : "bg-accent/10 text-accent"
                        )}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold tracking-tight">
                      {run.inputTask}
                    </p>
                  </div>
                  <div className="text-sm text-steel">
                    <p>{formatDateTime(run.startedAt)}</p>
                    <p className="mt-2">
                      <Link
                        href={`/dashboard?owner=${run.userId}`}
                        className="text-accent hover:opacity-80"
                      >
                        查看该用户全部会话
                      </Link>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <section className="space-y-4">
          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold tracking-tight">新增账户</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={createForm.username}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, username: event.target.value }))
                }
                placeholder="用户名"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <input
                value={createForm.displayName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="显示名称"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <input
                value={createForm.password}
                type="password"
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="初始密码"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value as UserRole
                    }))
                  }
                  className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
                <input
                  value={createForm.quotaLimit}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, quotaLimit: event.target.value }))
                  }
                  disabled={createForm.role === "admin"}
                  placeholder="对话额度"
                  className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={createUser}
                disabled={busyKey === "create-user"}
                className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                新建账户
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold tracking-tight">平台密钥与连接</h2>
            <p className="mt-1 text-sm text-steel">
              管理员可随时更新 EvoMap 与 LLM 凭据，新的运行会立即使用最新配置。
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["LLM API Key", managedSettings.minimaxApiKey],
                ["EvoMap API Key", managedSettings.evomapApiKey],
                ["EvoMap Node ID", managedSettings.evomapNodeId],
                ["EvoMap Node Secret", managedSettings.evomapNodeSecret]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-mist p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-steel/70">{label}</p>
                  <p className="mt-2 break-all text-sm text-ink">
                    {maskSecret(value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <textarea
                value={settingsForm.minimaxApiKey}
                onChange={(event) =>
                  setSettingsForm((current) => ({ ...current, minimaxApiKey: event.target.value }))
                }
                placeholder="LLM API Key"
                className="min-h-[96px] rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <textarea
                value={settingsForm.evomapApiKey}
                onChange={(event) =>
                  setSettingsForm((current) => ({ ...current, evomapApiKey: event.target.value }))
                }
                placeholder="EvoMap API Key"
                className="min-h-[96px] rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <input
                value={settingsForm.evomapNodeId}
                onChange={(event) =>
                  setSettingsForm((current) => ({ ...current, evomapNodeId: event.target.value }))
                }
                placeholder="EvoMap Node ID"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <textarea
                value={settingsForm.evomapNodeSecret}
                onChange={(event) =>
                  setSettingsForm((current) => ({ ...current, evomapNodeSecret: event.target.value }))
                }
                placeholder="EvoMap Node Secret"
                className="min-h-[96px] rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={saveSettings}
                disabled={busyKey === "settings"}
                className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent/30 disabled:opacity-60"
              >
                保存平台设置
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold tracking-tight">邀请码与注册</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={inviteForm.note}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="备注"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <input
                value={inviteForm.maxUses}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, maxUses: event.target.value }))
                }
                placeholder="可用次数"
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={createInviteCode}
                disabled={busyKey === "invite:create"}
                className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                生成邀请码
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {managedInvites.map((invite) => (
                <article
                  key={invite.id}
                  className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-ink">
                        {invite.code}
                      </p>
                      <p className="mt-1 text-xs text-steel/75">
                        {invite.note || "无备注"} · 已用 {invite.usedCount}/{invite.maxUses}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]",
                          invite.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        {invite.status}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateInviteCode(invite.id, {
                            status: invite.status === "active" ? "disabled" : "active"
                          })
                        }
                        className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-steel transition hover:border-accent/30 hover:text-ink"
                        disabled={busyKey === `invite:${invite.id}`}
                      >
                        {invite.status === "active" ? "禁用" : "启用"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function maskSecret(value: string | null) {
  if (!value) {
    return "未设置";
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}

function UserAdminCard({
  user,
  isSelf,
  busy,
  onSave
}: {
  user: ManagedUser;
  isSelf: boolean;
  busy: boolean;
  onSave: (userId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    quotaLimit: user.quotaLimit === null ? "" : String(user.quotaLimit),
    password: ""
  });

  return (
    <article className="rounded-[24px] border border-line/70 bg-[#f9fbfd] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">{user.displayName}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-steel">
              @{user.username}
            </span>
            <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-steel">
              {user.role}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]",
                user.status === "active"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              {user.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-steel/80">
            已使用 {user.quota?.used ?? 0} /{" "}
            {user.quota?.limit === null ? "无限" : user.quota?.limit ?? 0} 次对话
          </p>
          <p className="mt-1 text-xs text-steel/70">
            最近登录：{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "从未"}
          </p>
        </div>
        <Link
          href={`/dashboard?owner=${user.id}`}
          className="text-sm font-medium text-accent transition hover:opacity-80"
        >
          查看会话
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={form.username}
          onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
        <input
          value={form.displayName}
          onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
        <select
          value={form.role}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              role: event.target.value as UserRole
            }))
          }
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
        >
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
        <select
          value={form.status}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              status: event.target.value as UserStatus
            }))
          }
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
        >
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
        <input
          value={form.quotaLimit}
          onChange={(event) => setForm((current) => ({ ...current, quotaLimit: event.target.value }))}
          disabled={form.role === "admin"}
          placeholder={form.role === "admin" ? "管理员默认无限制" : "额度，留空为无限"}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent disabled:opacity-50"
        />
        <input
          value={form.password}
          type="password"
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="重置密码（留空则不修改）"
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-steel/70">
          {isSelf ? "当前登录账号" : "可修改该账号的角色、密码、额度和禁用状态"}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave(user.id, {
              username: form.username,
              displayName: form.displayName,
              role: form.role,
              status: form.status,
              quotaLimit: form.role === "admin" ? null : form.quotaLimit.trim() ? Number(form.quotaLimit) : null,
              password: form.password || undefined
            })
          }
          className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          保存账户
        </button>
      </div>
    </article>
  );
}
