# OtterTogglTrack

A VS Code extension for seamless time tracking with Toggl Track integration.

## Features

- **Status Bar Integration**: See your current timer status directly in the VS Code status bar
- **Quick Timer Control**: Start and stop timers with keyboard shortcuts
- **Project Selection**: Choose from your Toggl projects when starting a timer
- **Recent Entries**: Quickly continue tracking from recent time entries
- **Workspace Support**: Switch between multiple Toggl workspaces
- **Secure API Token Storage**: Your API token is stored securely using VS Code's secret storage

## Installation

1. Install the extension from the VS Code Marketplace
2. Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) to open the Toggl menu
3. Select "Configure API Token"
4. Enter your Toggl API token (find it at [profile.toggl.com](https://track.toggl.com/profile))

## Usage

### Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Show Menu | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| Start Timer | `Ctrl+Alt+S` | `Cmd+Alt+S` |
| Stop Timer | `Ctrl+Alt+X` | `Cmd+Alt+X` |

### Commands

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Toggl: Show Menu` - Open the main Toggl menu
- `Toggl: Start Timer` - Start a new time entry
- `Toggl: Stop Timer` - Stop the current time entry
- `Toggl: Set API Token` - Configure your Toggl API token
- `Toggl: Recent Entries` - View and continue from recent entries

### Status Bar

The status bar shows:
- Current timer duration and description when tracking
- "Toggl: Idle" when not tracking
- Click to open the Toggl menu

## Requirements

- A Toggl Track account ([sign up for free](https://toggl.com/track/))
- Your Toggl API token (found in your [Toggl profile settings](https://track.toggl.com/profile))

## Extension Settings

This extension stores your API token securely using VS Code's built-in secret storage.

## Known Issues

None at this time. Please report issues on the GitHub repository.

## Release Notes

### 0.0.3

- **Bug Fix**: Fixed "Recent Entries" functionality by adding authentication check

### 0.0.2

- **Performance**: Timer now uses local system time instead of polling Toggl API
- **API Optimization**: Reduced API calls to minimize rate limiting issues  
- **UI**: Status bar updates every second using local clock
- **Bug Fix**: Fixed Toggl API rate limit issues by removing continuous polling
- **UI**: Added beautiful otter icon

### 0.0.1

- Initial release
- Status bar integration
- Start/stop timers
- Project selection
- Recent entries
- Workspace switching
- Secure API token storage

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
