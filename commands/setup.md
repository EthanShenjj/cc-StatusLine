---
description: Setup and configure your CC-StatusLine status bar
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

## /CC-StatusLine:setup

Use this command to configure your token usage API key and status bar.

### Step 1: Detect Environment
Run these commands to find the paths for your configuration.

```bash
# Get the absolute path to cc-status.js
export CC_SCRIPT_PATH=$(pwd)/cc-status.js
echo "Detected script path: $CC_SCRIPT_PATH"
```

### Step 2: Request Token
Ask the user for their API Bearer Token.

### Step 3: Run Configuration
Run the setup command via the CLI:

```bash
node cc-status.js config --token <USER_TOKEN>
```

### Step 4: Verify Integration
Ensure `~/.claude/settings.json` is updated to include the status bar:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node $CC_SCRIPT_PATH"
  }
}
```

### Step 5: Success
Inform the user that CC-StatusLine is now active and will update with every command.
