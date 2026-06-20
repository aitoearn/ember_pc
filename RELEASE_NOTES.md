## Ember v1.0.0

面向 QA 团队的开源 AI 测试工作台：用例设计、回归规划、接口/E2E 验证、测试上下文沉淀、多模型分析与设备自动化。

- **仓库**：https://github.com/aitoearn/ember_pc
- **问题反馈**：https://github.com/aitoearn/ember_pc/issues
- **安装包**：https://github.com/aitoearn/ember_pc/releases
- **Homebrew**（macOS）：`brew tap aitoearn/tap && brew install --cask ember`

### 新功能
- 产品定位对齐「AI 测试工作台」：README、发布说明与 GitHub 元数据统一指向 `aitoearn/ember_pc`，便于 Issues、Releases 与 Homebrew 发布链路使用同一远程仓库。
- 设备自动化镜像体验增强：新增 `DeviceMirrorViewport` 统一 scrcpy / 截图镜像视口；补齐 Android 设备品牌推断（`deviceBrand`）、展示格式化（`deviceDisplay`）与 `androidDeviceMetadata` 元数据读取，设备列表与调试页展示更稳定。
- Agent App runtime 增加 App Server current client / capability API 接入，独立 Agent App 可以复用当前 JSON-RPC 客户端、能力宿主与运行态投影。
- Agent Runtime 标准包补齐 App Server facts、fixture replay、subagents、refs 与 validation 支持，方便外部运行态、投影层和 UI 组件消费同一组事实。
- App Server workspace / project git / session admin 协议新增工作区更新、工作区删除、project git worktree 删除、会话批量归档等 current JSON-RPC 能力，并同步到 Rust protocol catalog、schema export、npm `app-server-client` 与前端 API。
- App Server workspace 协议新增项目摘要读取能力，Agent 输入框增加项目上下文读取与展示能力，支持把当前工作区项目摘要带入主对话编排。
- Agent Chat Home / 空态工作台补齐任务入口、分组导航、轻量作业面板与可本地化文案资源，为工作台主屏提供更完整的起始体验。

### 修复
- 修复 Agent UI projection summary 与 subagents read model 的命名和汇总口径，减少 Team Workbench 旧语义残留。
- 修复 Agent App runtime 页面和投影桥接对 current capability host / client API 的接线，降低独立 App 与桌面宿主之间的协议漂移。
- 修复输入框、工具展示、workspace send runtime 与 thread grouping 的若干状态同步问题。
- 修复 DevBridge command policy 与 legacy surface catalog 对旧命令面的分类，避免已退场路径继续被误判为 current。
- 修复 App Server session archive / workspace deletion / project git worktree deletion 在本地数据源、processor dispatch 与 client 形状之间的协议漂移。

### 优化与重构
- Agent Chat 工作台主线从旧 Team Workspace 组件、selector、canvas runtime 与 suggestion 工具收敛到 subagents / workbench current 表达，删除大批旧 team workspace UI 面。
- `AppSidebar` 拆分为 account、appearance、invite、search、session、navigation target 与样式等子模块，显著降低单文件复杂度。
- 下线 Companion 相关 API、设置卡片、provider overview、desktop mock 与侧边入口残留，减少旧 companion 能力对当前设置页和 provider 面的干扰。
- 输入框项目上下文、team preference、project storage 与 workspace selection 逻辑继续向 hook / helper 分层收敛。
- Agent Runtime / Agent UI npm 包继续补齐标准 contracts、fixtures、projection、runtime facts 与 UI exports，减少 GUI 与 SDK 的重复实现。
- App Server processor 继续按 agent app、automation、gallery、gateway、mcp、media、model、project、skill、unified、voice、workspace 等领域模块拆分，降低中心 dispatcher 的膨胀风险。
- `packages/ember-cli-npm/bin/ember` 不再提交平台相关二进制产物，CLI 发布产物继续由 release pipeline 构建生成。
- 全仓 Git 地址从 `lmtestplatform` / `aiclientproxy/ember` / `embercloud/ember` 统一为 `https://github.com/aitoearn/ember_pc`，覆盖 `package.json`、README、Homebrew workflow、Cargo 元数据与前端反馈入口。

### 测试与质量
- 扩展 App Server protocol catalog、workspace / project git / session admin API、npm `app-server-client`、Agent Runtime client、projection、UI contracts 与 fixture replay 回归。
- 更新 AppSidebar、Agent Chat inputbar、Home / EmptyState / task tabs、workspace scene、workspace send、settings v2、Agent App runtime page 与 i18n 资源相关测试。
- 新增设备镜像视口、设备品牌/展示投影与 Android 元数据相关单元测试与组件回归。
- 更新 Electron SDK fixture smoke、tool surface smoke、command contract 检查、质量任务规划与 i18n readiness 报告。
- 根应用、Rust workspace、CLI npm package、Agent App runtime package、App Server client package、Agent Runtime client 依赖与锁文件版本统一更新到 `1.0.0`。
- 更新 app-server-client contract 检查、script root governance baseline、`tsconfig.electron.json` 与 `.gitignore`，保证生成协议、Electron 类型检查和脚本入口治理保持一致。

### 文档
- 新增 Agent Workbench 与 Subagents 路线图入口，补充 acceptance、iteration plan、parallel workstreams 与 task board。
- 更新 Agent Runtime、Agent UI 标准落差、completion audit、implementation plan、test cases 与 adjacent protocols 文档。
- 更新工程质量、命令边界、Playwright E2E、协议标准地图与技术债追踪文档，记录当前 workbench / subagents / App Server 主线边界。
- 更新脚本治理说明，记录当前 release / generated schema / app-server-client contract 的维护入口。

### 其他
- 本版继续把发布事实源收敛到 App Server JSON-RPC、Electron Desktop Host、current npm clients、`ember-rs/crates/**`、生成 schema 与机器可读守卫，避免旧 Team Workspace、Companion 和 legacy command 面回流。
- GitHub Releases、Homebrew Cask 与 CI `update-homebrew` workflow 现以 `aitoearn/ember_pc` 为下载与 homepage 事实源。

**完整变更**: `v1.65.0` -> `v1.0.0`
