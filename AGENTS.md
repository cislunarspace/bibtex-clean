## Agent skills

### Issue tracker

使用 GitHub；外部 PR 也视为待分流/请求入口。详见 `docs/agents/issue-tracker.md`。

### Triage labels

默认标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文仓库：在仓库根目录放置 `CONTEXT.md` 和 `docs/adr/`。详见 `docs/agents/domain.md`。

### Release process

发布由 CI 驱动，本地仅负责 bump 版本并推送 tag。详见 `docs/agents/release-process.md`。
