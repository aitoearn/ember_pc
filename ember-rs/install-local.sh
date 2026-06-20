#!/bin/bash

echo "🔧 Ember 本地安装脚本"
echo "================================"

# 1. 更新 Rust
echo "📦 检查 Rust 版本..."
CURRENT_VERSION=$(rustc --version | awk '{print $2}')
echo "当前版本: $CURRENT_VERSION"

if ! rustc --version | grep -q "1.9"; then
    echo "⚠️  Rust 版本过低，正在更新..."
    rustup update stable
    source "$HOME/.cargo/env"
fi

echo "✅ Rust 版本: $(rustc --version | awk '{print $1,$2}')"

# 2. 清理之前的构建
echo ""
echo "🧹 清理之前的构建..."
cargo clean 2>/dev/null || true

# 3. 编译
echo ""
echo "🔨 开始编译 (dev 模式)..."
cargo build 2>&1 | tee /tmp/ember_build.log

BUILD_STATUS=${PIPESTATUS[0]}
if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ 编译失败！查看日志: /tmp/ember_build.log"
    tail -50 /tmp/ember_build.log
    exit 1
fi

echo "✅ 编译成功"

# 4. 本地安装
echo ""
echo "📦 正在本地安装..."
cargo install --path . --force 2>&1 | tee /tmp/ember_install.log

INSTALL_STATUS=${PIPESTATUS[0]}
if [ $INSTALL_STATUS -ne 0 ]; then
    echo "❌ 安装失败！查看日志: /tmp/ember_install.log"
    tail -50 /tmp/ember_install.log
    exit 1
fi

echo "✅ 安装成功"

# 5. 验证安装
echo ""
echo "🔍 验证安装..."
if command -v ember &> /dev/null; then
    echo "✅ Ember 已安装到: $(which ember)"
else
    echo "⚠️  Ember 命令行工具未在 PATH 中"
    echo "安装位置: ~/.cargo/bin/ember"
    echo ""
    echo "请将以下内容添加到 ~/.zshrc 或 ~/.bash_profile:"
    echo 'export PATH="$HOME/.cargo/bin:$PATH"'
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "本脚本只安装 Rust CLI；Desktop GUI 由仓库根 Electron 命令接管。"
echo "运行应用:"
echo "  开发模式: cd .. && npm run electron:dev"
echo "  构建应用: cd .. && npm run electron:build"
echo "  GUI 冒烟: cd .. && npm run verify:gui-smoke"
