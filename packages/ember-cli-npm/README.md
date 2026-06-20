# `@aitoearn/ember_pc-cli`

Ember 的官方命令行入口，面向统一任务编排。

当前 npm 首发策略：

- 优先尝试下载预编译二进制
- 如果预编译资产暂未发布，npm 安装不会失败
- 运行时会优先查找：
  - `EMBER_CLI_BINARY_PATH`
  - 包内已存在的预编译二进制
  - 当前源码仓库中的本地构建产物
  - 当前源码仓库中的 `cargo run -p ember-cli`

当前主线提供：

- `ember media image generate`
- `ember media video generate`
- `ember task create image`
- `ember task create cover`
- `ember task create video`
- `ember task create broadcast`
- `ember task create url-parse`
- `ember task create typesetting`
- `ember task create resource-search`
- `ember task status`
- `ember task list`
- `ember task retry`
- `ember task cancel`
- `ember task result`
- `ember skill list`
- `ember skill show`
- `ember doctor`

安装方式：

```bash
npm install -g @aitoearn/ember_pc-cli
```

说明：

- npm wrapper 在 `postinstall` 阶段会从 `https://github.com/aitoearn/ember_pc/releases` 下载同版本预编译二进制。
- 当前预编译 release asset 覆盖：`darwin/arm64`、`darwin/amd64`、`windows/amd64`、`linux/amd64`。
- 若对应版本的 release asset 尚未发布，安装会失败，此时请先发布 GitHub release asset，或在本地直接编译 Rust 二进制使用。

示例：

```bash
ember media image generate \
  --prompt "未来城市插图，蓝色电影感" \
  --size "1024x1024" \
  --workspace "." \
  --idempotency-key "image-future-city"
```

```bash
ember media video generate \
  --prompt "产品发布短视频，干净工作台场景" \
  --aspect-ratio "16:9" \
  --duration 6 \
  --workspace "." \
  --idempotency-key "video-launch-demo"
```

成功时标准输出为 JSON，包含：

- `task_id`
- `task_type`
- `status`
- `normalized_status`
- `artifact_path`
- `absolute_artifact_path`
- `reused_existing`

失败时标准错误同样输出结构化 JSON，包含：

- `error_code`
- `error_message`
- `retryable`
- `hint`

常用命令：

```bash
ember task list --status failed
ember task status <task-id>
ember task retry <task-id>
ember task cancel <task-id>
ember skill list
ember skill show broadcast_generate
ember doctor
```

说明：

- 图片主线推荐使用 `ember media image generate`，它会在创建 task artifact 后继续推进真实图片执行链。
- `ember task create image` 作为兼容入口仍可使用，但现在也会复用同一条图片执行链，不会只停在 `pending_submit`。
- 视频主线推荐使用 `ember media video generate`，它会在创建 task artifact 后继续推进真实视频执行链。
- `ember task create video` 作为兼容入口仍可使用，但现在也会复用同一条视频执行链，不会只停在 `pending_submit`。
- `ember media cover generate` 仍保留为兼容别名。
- 如果你现在只发布 npm、不发布 GitHub Release，请至少准备一种运行方式：
  - 设置 `EMBER_CLI_BINARY_PATH`
  - 或在 Ember 源码仓库内使用该 wrapper，让它自动回退到 `cargo run`

## 维护者发布流程

1. 先构建对应目标平台的 `ember-cli`：

```bash
cargo build --manifest-path "../../ember-rs/Cargo.toml" -p ember-cli --release
```

2. 生成和 npm wrapper 约定一致的 release asset：

```bash
npm run build:release -- \
  --binary "../../ember-rs/target/release/ember" \
  --out-dir "./dist"
```

也可以在 CI 中直接传 target triple：

```bash
npm run build:release -- \
  --target-triple "aarch64-apple-darwin" \
  --version "1.33.0" \
  --out-dir "./dist"
```

3. 将生成的归档上传到 GitHub Release，对应命名形如：

- `ember-<version>-darwin-arm64.tar.gz`
- `ember-<version>-darwin-amd64.tar.gz`
- `ember-<version>-windows-amd64.zip`
- `ember-<version>-linux-amd64.tar.gz`

4. 确认 release asset 已上传后，再执行 npm 发布：

```bash
npm publish --access public
```
