# BibTeX Clean 领域词汇表

本文件记录 BibTeX Clean 插件的领域术语。只包含业务概念，不包含实现细节。

## 核心术语

### 清理（Cleaning）

对 Zotero 条目的字段应用规则，修改字段值，使其符合 BibTeX 输出或元数据规范的过程。

> 用户原称"清洗"，统一为"清理"。代码中以 `clean*` 前缀表示。

### 目标条目（Target Item）

用户选中的、将要被清理的 Zotero 条目。一次清理操作可以作用于一个或多个目标条目。

### 清理规则（Cleaning Rule）

针对特定字段的转换规则。当前规则：

- `author` 规则：将字段值中的 `;` 替换为 `and`。
- `number` 规则：将字段值中的汉字 `第`、`期` 移除。

### 变更（Change）

对单个字段应用一条清理规则后，该字段从旧值到新值的转换。一个目标条目可以产生零个或多个变更。

变更类型按职责拆分为两个更窄的类型：

- **字段变更（FieldChange）**：`{ itemKey, field, oldValue, newValue }`，writer 消费的纯数据载荷。
- **展示变更（DisplayChange）**：`FieldChange & { itemTitle }`，对话框和通知消费的展示数据。

`computeChanges` 返回 `DisplayChange`；writer 边界（`applyChanges` / `undoChanges`）接收 `FieldChange`。

### 模拟运行（Dry Run）

在请求用户确认之前，先计算所有目标条目会产生的变更，但不写入 Zotero 数据库的过程。

### 确认对话框（Confirmation Dialog）

展示模拟运行结果，提示用户清理操作会导致什么变化，并请求用户确认或取消的界面。

### 部分成功（Partial Success）

一次批量清理操作中，部分目标条目成功写入变更，另一部分因写入失败等原因未成功写入的状态。

### 撤销（Undo）

恢复最近一次清理操作对目标条目字段的修改。插件在内存中保留最近一次清理的原始字段值，用于撤销。
