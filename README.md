# CC-StatusLine

A custom status bar plugin for **Claude Code** that displays real-time token usage from a private API.

![Status Line Example](https://via.placeholder.com/800x100.png?text=Usage:+1.2K+/+5M+(0.0%25)+|+Avail:+4.99M)

## Features

- 实时显示 Token 使用情况 (Used vs Granted).
- 显示剩余可用额度 (Available).
- 自动颜色提示（接近额度时变为黄色/红色）。
- 缓存机制，减少 API 请求压力。
- 交互式配置流程。

---

## AI-Powered Installation (AI 自动安装)

If you are using **Claude Code**, you can simply paste the following prompt to let Claude handle the entire installation for you:

> "Help me install this status bar plugin: https://github.com/EthanShenjj/cc-StatusLine.git. Please clone it to ~/.claude/plugins/cc-StatusLine, run the setup script, and help me update my ~/.claude/settings.json to enable the status bar."

---

## Quick Install (快速安装)

Copy and paste this one-liner into your terminal to download and configure the plugin in seconds:

```bash
git clone https://github.com/EthanShenjj/cc-StatusLine.git ~/.claude/plugins/cc-StatusLine && node ~/.claude/plugins/cc-StatusLine/cc-status.js setup
```

After running the command and entering your credentials, simply add the plugin to your Claude Code settings as described below.

---

## Installation (详细安装步骤)

### 1. Clone the plugin
First, clone this repository into your Claude Code plugins directory:

```bash
mkdir -p ~/.claude/plugins
cd ~/.claude/plugins
git clone https://github.com/EthanShenjj/cc-StatusLine.git
cd cc-StatusLine
```

### 2. Configure the plugin
Run the built-in setup command to configure your API Token and URL:

```bash
# Within the cc-StatusLine directory
node cc-status.js setup
```

Follow the prompts to enter your API credentials.

### 3. Enable the Status Bar
To make the status bar visible in Claude Code, you need to add it to your global Claude settings.

Open `~/.claude/settings.json` and add or update the `statusLine` section:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/cc-StatusLine/cc-status.js"
  }
}
```

> [!IMPORTANT]
> Make sure the path in `"command"` matches the actual location where you cloned the repository. Using absolute paths starting with `~` or `/Users/YOUR_NAME/` is recommended.

---

## Usage (使用说明)

Once installed, the status line will automatically update every time you run a command in Claude Code.

### Commands

- `node cc-status.js`: Displays current usage (used by the status bar).
- `node cc-status.js setup`: Opens the interactive configuration tool.
- `node cc-status.js config --token <TOKEN> --url <URL>`: Quick CLI configuration.

### Troubleshooting

If the status bar shows `(stale)`, it means the plugin is using cached data because the API could not be reached. The cache refreshes every 2 minutes.

---

## Requirements

- **Node.js**: v18 or higher.
- **Claude Code**: The plugin is designed specifically for the Claude Code CLI.

## License

MIT
