# Change Log

All notable changes to the "ottertoggltrack" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4] - 2025-12-06

### Added
- Automatic synchronization with Toggl API every 15 minutes
- Cross-device support: detects timers started/stopped from other devices
- Smart sync logic: only updates when local and remote state differ

## [0.0.3] - 2025-12-03

### Fixed
- Fixed "Recent Entries" functionality by adding authentication check

## [0.0.2] - 2025-12-03

### Changed
- Timer now uses local system time instead of polling Toggl API
- Reduced API calls to minimize rate limiting issues
- Status bar updates every second using local clock
- Extension renamed from "OtterToggleTrack" to "OtterTogglTrack"

### Fixed
- Fixed Toggl API rate limit issues by removing continuous polling
- Fixed "Recent Entries" not checking authentication status

### Added
- Beautiful otter icon with clock

## [0.0.1] - 2025-12-03

### Added
- Initial release
- Status bar integration with timer display
- Start/Stop timer functionality
- Project selection when starting timer
- Recent entries list to continue previous tasks
- Workspace switching support
- Secure API token storage using VS Code SecretStorage
- Keyboard shortcuts (Ctrl+Shift+T, Ctrl+Alt+S, Ctrl+Alt+X)