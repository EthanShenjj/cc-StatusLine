---
description: Setup and configure your CC-StatusLine status bar
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

## /CC-StatusLine:setup

Use this command to configure your token usage API key and status bar.

### Step 1: Detect Environment
Identify the node runtime and script path.

### Step 2: Request Token
Ask the user for their API Bearer Token.

### Step 3: Run Configuration
Run the setup command via the CLI:

```bash
/Users/ethanshen/.nvm/versions/node/v20.19.5/bin/node /Users/ethanshen/.claude/plugins/CC-StatusLine/cc-status.js config --token <USER_TOKEN>
```

### Step 4: Verify Integration
Ensure `~/.claude/settings.json` is updated to include the status bar:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/Users/ethanshen/.nvm/versions/node/v20.19.5/bin/node /Users/ethanshen/.claude/plugins/CC-StatusLine/cc-status.js"
  }
}
```

### Step 5: Success
Inform the user that CC-StatusLine is now active and will update with every command.
