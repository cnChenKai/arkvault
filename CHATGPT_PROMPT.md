# ChatGPT Prompt — ArkVault 项目文档生成

> 把下面整段复制粘贴给 ChatGPT，让它一次性输出 README.md、AGENTS.md 和 docs/DESIGN.md

---

## Prompt 开始

你是一个资深 HarmonyOS NEXT 应用架构师和安全工程师。我正在开发一个 **鸿蒙原生密码管理器** 叫 **ArkVault**，请帮我生成以下三个项目文档。

### 项目背景

ArkVault 是一个 HarmonyOS NEXT 原生密码管理器，使用 ArkTS + ArkUI 开发。分两个大阶段：

**Phase 1 — 本地密码管理（MVP）**
- 纯本地存储，不联网
- 密码条目的 CRUD（增删改查）
- 分类/文件夹/标签管理
- 支持从 Bitwarden（CSV/JSON）、1Password、LastPass、Chrome 等导入
- 生物识别（指纹/面部）+ 主密码解锁
- 安全剪贴板（复制后自动清除）
- 密码生成器
- 利用鸿蒙系统 API：Asset Store Kit（加密存储）、Crypto Architecture Kit（加解密）、Universal Keystore Kit（硬件密钥）、User Authentication Kit（生物认证）、RDB（本地数据库）

**Phase 2 — 云端同步**
- 接入 Vaultwarden / Bitwarden 服务端
- 实现 Bitwarden E2EE 加密协议（PBKDF2/HKDF 密钥派生、AES-256-CBC + HMAC）
- Bitwarden 客户端 API 对接（/identity/connect/token、/api/sync、/api/ciphers 等）
- 全量同步 + 本地 diff + 冲突解决
- 2FA 支持（TOTP）
- 可配置自建服务器地址

### 需要生成的文档

---

#### 1. README.md

用英文写，面向开发者。包含：
- 项目名称 + 一句话描述 + logo 占位
- Features 列表（Phase 1 和 Phase 2 分开标注）
- Screenshots 占位区域
- Tech Stack（HarmonyOS NEXT、ArkTS、ArkUI、Asset Store Kit、Crypto Architecture Kit、Universal Keystore Kit、RDB）
- 快速开始（DevEco Studio 环境配置、clone、构建、运行）
- 项目结构（标准鸿蒙项目结构：entry/src/main/ets/ 下分 pages、components、services、models、utils、crypto）
- 导入支持的密码管理器列表
- 安全设计概述（零知识、本地加密、硬件密钥存储）
- Roadmap（Phase 1 → Phase 2 的时间线）
- Contributing 指引
- License: MIT
- 致谢（Bitwarden 开源协议参考、鸿蒙开发者社区）

---

#### 2. AGENTS.md

这是给 AI coding agent（如 ChatGPT、Cursor、Copilot）看的上下文文件，让它理解项目约定。英文写。包含：

- 项目概述（一句话）
- 技术栈详细说明
- 代码规范：
  - ArkTS 编码风格（遵循华为 HarmonyOS 编码规范）
  - 命名约定（组件用 PascalCase，变量用 camelCase，常量用 UPPER_SNAKE_CASE）
  - 文件组织（每个页面一个文件夹，公共组件放 components/）
  - 注释语言（代码注释用英文，UI 文本用中文）
- 安全红线：
  - 主密码绝不明文存储或传输
  - 所有敏感数据必须通过 Asset Store Kit 存取
  - 不使用 console.log 输出敏感信息
  - 加密操作必须使用硬件密钥（Universal Keystore Kit），不软存密钥
- 架构约定：
  - 分层架构：UI Layer (pages/components) → Service Layer → Data Layer (models/DAO)
  - 加密操作封装在 crypto/ 目录，UI 层不直接调用加密 API
  - 所有数据库操作通过 DAO 模式，不直接写 SQL
- 构建和运行指令
- 常见陷阱和注意事项（鸿蒙权限声明、Asset Store Kit 的 ACL 配置等）

---

#### 3. docs/DESIGN.md

详细的技术设计文档，英文写。包含：

**Architecture Overview**
- 分层架构图（文字描述 + ASCII 图）
- 模块依赖关系

**Data Model**
- PasswordEntry 实体设计（id、title、username、password、url、notes、folder、tags、favorite、createdAt、updatedAt、passwordHistory）
- Folder 实体
- Tag 实体
- VaultConfig（主配置：加密参数、服务器地址等）
- ER 关系图

**Security Design**
- 主密码处理流程：用户输入 → PBKDF2 派生 master key → AES-256-GCM 加密数据密钥 → 存入 Asset Store
- 密钥层级：Master Password → Master Key → Stretched Key → Vault Encryption Key → 每条记录的独立密钥
- Asset Store Kit 使用策略（锁屏锁定、同步策略、持久化策略）
- Universal Keystore Kit 密钥生成和使用流程
- 剪贴板安全策略

**Import/Export Design**
- 支持格式矩阵（Bitwarden CSV、Bitwarden JSON、1Password 1pux、LastPass CSV、Chrome CSV、通用 CSV）
- 导入流程：文件选择 → 格式检测 → 字段映射 → 数据验证 → 加密存储
- 导出流程（Phase 1 暂不实现，但预留接口）

**Sync Design (Phase 2)**
- Bitwarden API 认证流程图
- E2EE 密钥派生完整流程
- 同步状态机：idle → syncing → resolving → done/error
- 冲突解决策略（last-write-wins + 保留双方版本）
- 离线队列设计

**API Reference (Phase 2)**
- Bitwarden API 端点映射表
- 请求/响应示例
- 错误处理策略

**UI/UX Design**
- 页面列表和导航结构
  - VaultListPage（主列表，支持搜索/筛选）
  - EntryDetailPage（密码详情/编辑）
  - GeneratorPage（密码生成器）
  - ImportPage（导入向导）
  - SettingsPage（设置：生物识别、自动锁定、服务器配置）
  - LockPage（解锁页面）
- 交互流程图
- 设计规范（颜色、字体、间距 — 遵循 HarmonyOS Design System）

**Testing Strategy**
- 单元测试：加密模块、数据模型、导入解析
- 集成测试：Asset Store 读写、数据库操作
- UI 测试：ArkUI 组件测试

**Build & Release**
- DevEco Studio 配置
- 签名和发布到 AppGallery
- 版本管理策略

---

### 输出要求

1. 三个文件分别输出，用 markdown 代码块包裹，标注文件名
2. README.md 放在根目录
3. AGENTS.md 放在根目录
4. DESIGN.md 放在 docs/ 目录下
5. 语言：README 和 AGENTS 用英文，DESIGN 用英文
6. 内容要具体、可执行，不要泛泛而谈
7. 加密相关内容要准确（PBKDF2 iterations ≥ 600,000、AES-256-GCM 等当前最佳实践）

## Prompt 结束
