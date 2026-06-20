cask "ember" do
  version "0.37.0"

  on_arm do
    sha256 "REPLACE_WITH_ARM64_SHA256"
    url "https://github.com/aitoearn/ember_pc/releases/download/v#{version}/Ember_#{version}_aarch64.dmg"
  end

  on_intel do
    sha256 "REPLACE_WITH_X64_SHA256"
    url "https://github.com/aitoearn/ember_pc/releases/download/v#{version}/Ember_#{version}_x64.dmg"
  end

  name "Ember"
  desc "AI 代理服务桌面应用 - 多 Provider API Key 管理"
  homepage "https://github.com/aitoearn/ember_pc"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Ember.app"

  zap trash: [
    "~/Library/Application Support/com.embercloud.ember",
    "~/Library/Caches/com.embercloud.ember",
    "~/Library/Preferences/com.embercloud.ember.plist",
    "~/Library/Saved Application State/com.embercloud.ember.savedState",
  ]
end
