# Ember Homebrew Tap

Ember 的 Homebrew Cask 分发仓库。

## 安装

```bash
# 添加 tap
brew tap terryso/tap

# 安装 Ember
brew install --cask ember
```

## 更新

```bash
brew upgrade --cask ember
```

## 卸载

```bash
brew uninstall --cask ember
```

## 维护说明

### 手动更新版本

1. 下载新版本的 DMG 文件
2. 计算 sha256: `shasum -a 256 Ember_x.x.x_aarch64.dmg`
3. 更新 `Casks/ember.rb` 中的 `version` 和 `sha256`
4. 推送到仓库

### 自动化更新

使用 `scripts/update-cask.sh` 脚本自动更新：

```bash
./scripts/update-cask.sh 0.38.0
```

该脚本会自动下载 DMG、计算 sha256、更新 Cask 文件。
