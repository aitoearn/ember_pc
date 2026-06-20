<div align="center"><a name="readme-top"></a>

<img src="./docs/images/readme-hero.png" alt="Ember README 主视觉：测试一下，质量即见" width="100%" />

# Ember

### 测试一下，质量即见

**给测试团队用的开源 AI 测试工作台**

AI test workspace for QA teams: test design, regression planning, API/E2E validation, knowledge context, multi-model analysis, and device automation workflows.

**简体中文** · [English](./README.en.md) · [文档](./docs/README.md) · [发布记录](./RELEASE_NOTES.md) · [问题反馈](https://github.com/embercloud/ember/issues)

<p>
  <a href="https://github.com/embercloud/ember/releases"><img src="https://img.shields.io/github/v/release/embercloud/ember?label=release" alt="Ember GitHub Release" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-246B45" alt="Ember supports macOS and Windows" />
  <img src="https://img.shields.io/badge/desktop-Electron-24C8DB" alt="Ember is an Electron desktop app" />
  <img src="https://img.shields.io/badge/license-GPLv3-2F4F4F" alt="Ember GPLv3 license" />
</p>

把需求、测试上下文、用例、执行记录和回归复盘放在一个地方，让一次测试不是一次性聊天，而是一条能继续推进的质量工作流。

</div>

---

<details>
<summary><kbd>目录</kbd></summary>

- [Ember 是什么](#ember-是什么)
- [你可以用 Ember 做什么](#你可以用-ember-做什么)
- [几个测试团队会遇到的真实时刻](#几个测试团队会遇到的真实时刻)
- [一次测试任务可以这样开始](#一次测试任务可以这样开始)
- [核心工作流](#核心工作流)
- [适合谁](#适合谁)
- [如果你在找这些工具](#如果你在找这些工具)
- [不太适合谁](#不太适合谁)
- [快速开始](#快速开始)
- [技术栈与平台](#技术栈与平台)
- [常见问题](#常见问题)
- [开源协议](#开源协议)
- [免责声明](#免责声明)

</details>

---

## Ember 是什么

Ember 是一个开源的 Electron 桌面端 AI 测试工作台，面向 QA 工程师、测试开发、发布经理和小型质量团队，覆盖用例设计、回归规划、接口验证、E2E 方案、性能与安全测试、项目测试上下文管理和多模型分析流程。

English summary: Ember is an open-source desktop AI workspace for QA teams to design tests, plan regression, validate APIs, organize test context, and reuse multi-model quality workflows.

你可以把它理解成一个更适合长期测试工作的 AI 工作台：

- 不是只问一句、答一句，而是围绕一个版本或项目持续推进验证
- 不是每次都重新找 PRD、接口文档和旧用例，而是把测试上下文和做法沉淀下来
- 不是结论散落在聊天记录里，而是把用例、清单和报告保存下来，下一轮还能继续用
- 不是绑定某一家 AI 服务，而是让你使用自己已经配置好的模型能力

如果你经常在需求文档、接口平台、缺陷系统、自动化脚本和模型后台之间来回切换，Ember 想帮你把这些动作收回到同一个测试空间里。

---

## 你可以用 Ember 做什么

- **用例设计与测试分析**：整理功能用例、接口用例、边界场景和断言清单
- **回归与发布验证**：按版本范围梳理回归清单、优先级和发布门禁建议
- **专项测试方案**：兼容性矩阵、E2E 主路径、性能压测、安全验证提纲
- **测试上下文管理**：沉淀 PRD、接口文档、测试规范、环境信息和历史缺陷
- **专家与 Skills 协作**：使用测试策略、用例设计、自动化、性能、安全等专家与内置测试 Skill
- **Agent Apps 与端自动化**：通过测试工作台 App 组织批次执行；结合设备自动化做移动端验证

---

## 几个测试团队会遇到的真实时刻

### 1. 发布前：版本范围很大，但回归清单还没理顺

临近发版，改动涉及登录、订单和支付多条链路。你知道要回归，但很难快速判断哪些模块必须覆盖、哪些可以抽样。

用 Ember 时，你可以把版本说明、核心链路和已知风险放进同一个任务里，让 AI 先整理回归范围和优先级，再继续追问：哪些场景必须全量跑？哪些依赖环境准备？

最后留下的不只是一次回答，而是一条从范围梳理到执行清单的测试记录。

### 2. 接口测试：文档有了，但用例和断言还没成型

OpenAPI 或接口说明已经齐，但正常路径、鉴权失败、边界值和异常响应还没系统化整理。

在 Ember 里，你可以把接口契约和关注场景放进任务，生成可继续补充的接口用例与断言点，并沉淀到当前项目的测试上下文中。

### 3. 多端项目：兼容性矩阵难以及时更新

同一功能要在 Web、移动端和不同系统版本上验证。手工维护兼容矩阵成本高，还容易漏掉关键组合。

Ember 更适合这种专项任务：先整理覆盖矩阵和风险优先级，再逐条补充用例，并把结果写回当前工作区继续迭代。

### 4. 缺陷复盘：问题很多，但缺少结构化分析

一个版本积累了不少缺陷，团队需要看清模块分布、复发风险和高频根因，却缺少时间做系统整理。

用 Ember 时，你可以导入缺陷摘要或测试记录，先让它帮你归类和分析，再形成下一轮测试策略和观察指标。

### 5. 小团队：测试方法在个人经验里，难以复用

有人擅长接口测试，有人擅长 E2E，有人擅长性能分析。问题是这些经验常常没有沉淀成团队可复用的入口。

Ember 可以把稳定有效的测试做法沉淀成 Skills、专家和 App 入口：下次做回归规划、接口验证或发布评审时，不需要从空白输入框开始。

---

## 一次测试任务可以这样开始

1. 新建一个任务，比如「整理 v2.3 发布候选版的回归测试范围」
2. 放入 PRD 摘要、接口说明、已知缺陷或环境约束
3. 选择你想用的 AI 服务商和模型
4. 让 Ember 先整理测试范围、场景或用例结构
5. 在同一个任务里继续补充断言、扩写 E2E 步骤或生成专项测试方案
6. 把满意的结果保存到项目资料，作为下一轮验证的上下文

简单说：先把测试上下文放进来，再让 AI 帮你推进，最后把有用的结果留下来。

---

## 核心工作流

### 从一个测试任务开始

<img src="./docs/images/readme-feature-start.png" alt="Ember 从一个测试任务开始功能图" />

你可以从一句测试目标开始，把资料、模型、常用 Skill 和最近结果放在同一个地方，不用先面对一整面复杂工具菜单。

### 在同一个测试空间里持续修改

<img src="./docs/images/readme-feature-workspace.png" alt="Ember 同一空间持续打磨功能图" />

生成、追问、修改、查找资料和整理结果都围绕当前任务展开。适合需要多轮打磨的用例、回归清单、测试报告和专项方案。

### 使用自己的 AI 服务

<img src="./docs/images/readme-feature-provider.png" alt="Ember 使用自己的 AI 服务功能图" />

Ember 本身不提供 AI 模型服务。你可以配置自己的 AI 服务商、服务商密钥和常用模型，让不同测试任务使用不同能力。

---

## 适合谁

- QA 工程师、测试开发、质量负责人和发布经理
- 需要维护回归清单、接口用例、E2E 方案或专项测试文档的团队
- 经常整理 PRD、接口文档、缺陷和测试报告的人
- 想把个人测试方法、团队模板和项目上下文保存下来的人
- 已经在使用 AI 模型，希望有一个更稳定测试工作台的人

---

## 如果你在找这些工具

Ember 可能适合这些搜索场景：AI test workspace、desktop QA tool、test case design、regression planning、API testing assistant、knowledge base for testing、multi-model workflow、测试工作台、桌面端 AI 测试、用例设计、回归测试、接口测试、E2E 测试、性能测试、安全测试、测试知识库、移动端自动化。

---

## 不太适合谁

- 只想打开网页随便问一句，不想管理项目和测试上下文的人
- 完全不想配置任何 AI 服务商或服务商密钥的人
- 期待一个自动代替你执行全部测试并承担质量责任的工具的人

Ember 更适合把 AI 当成测试协作伙伴的人：你提供范围、上下文和判断，它帮你整理、生成、分析和复盘。

---

## 快速开始

### 下载安装

从 [Releases](https://github.com/embercloud/ember/releases) 下载对应平台安装包。

- macOS 用户下载 `.dmg` 或使用 Homebrew 安装
- Windows 用户下载 `Ember_*_x64-setup.exe`
- 当前仅提供 macOS 与 Windows 发布包，Linux 桌面端已暂停支持
- 如果 Windows 出现 SmartScreen 提示，通常是未签名或签名信誉不足导致，不代表安装包一定损坏

会使用 Homebrew 的 macOS 用户也可以运行：

```bash
brew tap aiclientproxy/tap
brew install --cask ember
```

### 第一次使用

1. 打开 Ember
2. 进入 AI 服务商配置页
3. 填入你自己的服务商密钥，并测试连接
4. 回到首页，新建一个测试任务
5. 放入 PRD、接口说明或测试目标，开始生成用例或回归清单

---

## 技术栈与平台

- 桌面框架：Electron、Rust App Server
- 前端技术：React、TypeScript、Vite
- 支持平台：macOS、Windows
- 开源协议：GPLv3

---

## 常见问题

### Ember 会提供 AI 模型吗？

不会。Ember 是测试工作台，不直接提供模型服务。你需要配置自己可用的 AI 服务商和服务商密钥。如果你不知道服务商密钥是什么，可以先把它理解成 AI 服务商给你的使用凭证。

### 我的测试资料会全部上传吗？

Ember 优先把项目资料、历史会话和配置保存在本机。但当你调用 AI 生成内容时，相关输入会发送给你配置的 AI 服务商。敏感资料请根据服务商政策自行判断是否使用。

### 它和普通聊天工具有什么不同？

普通聊天工具更像一次问答。Ember 更强调长期测试工作：上下文可以保存，用例和清单可以沉淀，任务可以继续推进，常用做法可以复用。

### 我不会写复杂提示词也能用吗？

可以。Ember 的目标之一就是减少每次从空白提示词开始的成本。你可以从内置测试 Skill、专家入口、项目资料和已有结果开始，让 AI 一步步帮你推进。

---

## 开源协议

[GNU General Public License v3 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0)

## 免责声明

本项目仅供学习研究使用，用户需自行承担使用风险。
本项目不直接提供 AI 模型服务，模型能力由第三方服务商提供。

---

<div align="center">



</div>
