# BibTeX Clean

一个 Zotero 插件。在 Zotero 中选中条目后，通过右键菜单将清理后的 BibTeX 复制到剪贴板。

## 功能

- 将 `author` 字段中的 `;` 替换为 `and`。
- 从 `number` 字段中移除汉字 `第` 和 `期`。

## 安装

1. 在 [Releases](https://github.com/ouyangjiahong/bibtex-clean/releases) 页面下载最新 `.xpi` 文件。
2. 打开 Zotero，点击 `Tools → Add-ons`。
3. 点击右上角的齿轮图标，选择 `Install Add-on From File...`。
4. 选择下载的 `.xpi` 文件，按提示完成安装。

## 使用

1. 在 Zotero 主窗口中选中一个或多个条目。
2. 右键点击选中的条目，选择 `复制清理后的 BibTeX`。
3. 清理后的 BibTeX 已复制到剪贴板，可直接粘贴使用。

## 开发

### 环境要求

- Node.js 18+
- npm
- Zotero 桌面客户端

### 配置

复制 `.env.example` 为 `.env`，并填入本地 Zotero 路径：

```ini
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/ouyangjiahong/Zotero/zotero
ZOTERO_PLUGIN_PROFILE_PATH=/home/ouyangjiahong/.zotero/zotero/xxxx.default
```

### 常用命令

```bash
# 安装依赖
npm install

# 启动 Zotero 并开启热重载
npm start

# 构建生产 XPI
npm run build

# 代码检查
npm run lint:check
```

## 项目结构

```
.
├── addon/              # 插件静态资源与 manifest
│   ├── bootstrap.js    # 插件生命周期入口
│   ├── manifest.json   # 插件元数据
│   └── locale/         # 本地化文件
├── src/                # TypeScript 源码
│   ├── hooks.ts        # 生命周期与菜单注册
│   ├── modules/
│   │   ├── bibtexClean.ts   # BibTeX 清理逻辑
│   │   └── bibtexExport.ts  # 导出与剪贴板复制
│   └── utils/
│       └── locale.ts   # 本地化工具
└── zotero-plugin.config.ts  # 构建配置
```

## 许可证

AGPL-3.0-or-later
