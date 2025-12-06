import * as vscode from 'vscode';
import { TogglApi, TogglWorkspace } from './togglApi';
import { StatusBarManager } from './statusBar';

export class CommandsManager {
    private togglApi: TogglApi;
    private statusBar: StatusBarManager;
    private workspaces: TogglWorkspace[] = [];
    private currentWorkspaceId: number | undefined;
    private syncInterval: NodeJS.Timeout | undefined;
    private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    constructor(togglApi: TogglApi, statusBar: StatusBarManager) {
        this.togglApi = togglApi;
        this.statusBar = statusBar;
    }

    /**
     * Initialize and check for running timer (called once at startup)
     */
    async initialize(): Promise<void> {
        const isConnected = await this.togglApi.initialize();
        if (isConnected) {
            try {
                // Fetch current entry only once at startup to restore state
                await this.syncWithToggl();
                const me = await this.togglApi.getMe();
                this.currentWorkspaceId = me.default_workspace_id;
                
                // Start periodic sync every 15 minutes
                this.startPeriodicSync();
            } catch (error) {
                console.error('Failed to initialize:', error);
            }
        }
    }

    /**
     * Start periodic synchronization with Toggl API every 15 minutes
     */
    private startPeriodicSync(): void {
        this.stopPeriodicSync(); // Clear any existing interval
        this.syncInterval = setInterval(() => this.syncWithToggl(), this.SYNC_INTERVAL_MS);
        console.log('OtterTogglTrack: Started periodic sync every 15 minutes');
    }

    /**
     * Stop periodic synchronization
     */
    stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = undefined;
        }
    }

    /**
     * Sync local timer state with Toggl API
     * This checks if there's a running entry on Toggl and updates local state accordingly
     */
    private async syncWithToggl(): Promise<void> {
        try {
            const currentEntry = await this.togglApi.getCurrentTimeEntry();
            const localState = this.statusBar.getTimerState();

            if (currentEntry) {
                // There's a running entry on Toggl
                if (!localState.isRunning || localState.entryId !== currentEntry.id) {
                    // Either we weren't tracking or it's a different entry - sync from Toggl
                    this.statusBar.restoreFromEntry(currentEntry);
                    console.log('OtterTogglTrack: Synced running entry from Toggl:', currentEntry.description);
                }
                // If same entry is running locally, keep local timer (more accurate)
            } else {
                // No entry running on Toggl
                if (localState.isRunning) {
                    // We were tracking locally but Toggl shows no entry - someone stopped it elsewhere
                    this.statusBar.stopTimer();
                    console.log('OtterTogglTrack: Timer stopped externally, synced');
                }
            }
        } catch (error) {
            console.error('OtterTogglTrack: Sync failed:', error);
            // Don't show error to user for background sync - just log it
        }
    }

    async setApiToken(): Promise<void> {
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your Toggl API token',
            password: true,
            placeHolder: 'Your API token from profile.toggl.com',
            ignoreFocusOut: true,
        });

        if (token) {
            await this.togglApi.setApiToken(token);
            try {
                const me = await this.togglApi.getMe();
                this.currentWorkspaceId = me.default_workspace_id;
                this.workspaces = await this.togglApi.getWorkspaces();
                vscode.window.showInformationMessage(`Connected to Toggl as ${me.fullname || me.email}`);
                
                // Check for running timer after connecting and start periodic sync
                await this.syncWithToggl();
                this.startPeriodicSync();
            } catch (error) {
                await this.togglApi.clearApiToken();
                vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    async showMenu(): Promise<void> {
        const isConnected = await this.togglApi.initialize();
        
        if (!isConnected) {
            const action = await vscode.window.showQuickPick(
                ['Configure API Token'],
                { placeHolder: 'Toggl is not configured' }
            );
            if (action === 'Configure API Token') {
                await this.setApiToken();
            }
            return;
        }

        const isRunning = this.statusBar.isTimerRunning();
        const timerState = this.statusBar.getTimerState();
        const items: vscode.QuickPickItem[] = [];

        if (isRunning) {
            items.push({
                label: '$(debug-stop) Stop Current Timer',
                description: timerState.description || 'No description',
            });
        } else {
            items.push({
                label: '$(play) Start New Timer',
                description: 'Start tracking time',
            });
        }

        items.push(
            { label: '$(history) Recent Entries', description: 'Continue a recent timer' },
            { label: '$(gear) Change Workspace', description: 'Switch Toggl workspace' },
            { label: '$(key) Update API Token', description: 'Change your API token' },
            { label: '$(sign-out) Disconnect', description: 'Remove API token' }
        );

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Toggl Track Actions',
        });

        if (!selected) {
            return;
        }

        switch (selected.label) {
            case '$(debug-stop) Stop Current Timer':
                await this.stopTimer();
                break;
            case '$(play) Start New Timer':
                await this.startTimer();
                break;
            case '$(history) Recent Entries':
                await this.showRecentEntries();
                break;
            case '$(gear) Change Workspace':
                await this.selectWorkspace();
                break;
            case '$(key) Update API Token':
                await this.setApiToken();
                break;
            case '$(sign-out) Disconnect':
                await this.disconnect();
                break;
        }
    }

    async startTimer(): Promise<void> {
        if (!this.currentWorkspaceId) {
            try {
                const me = await this.togglApi.getMe();
                this.currentWorkspaceId = me.default_workspace_id;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return;
            }
        }

        const description = await vscode.window.showInputBox({
            prompt: 'What are you working on?',
            placeHolder: 'Task description',
        });

        if (description === undefined) {
            return;
        }

        let projectId: number | undefined;
        
        try {
            const projects = await this.togglApi.getProjects(this.currentWorkspaceId);
            if (projects && projects.length > 0) {
                const projectItems = [
                    { label: 'No Project', id: undefined },
                    ...projects.filter(p => p.active).map(p => ({ label: p.name, id: p.id }))
                ];
                
                const selectedProject = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a project (optional)',
                });
                
                if (selectedProject) {
                    projectId = selectedProject.id;
                }
            }
        } catch {
            // Projects fetch failed, continue without project
        }

        try {
            // Send start request to Toggl and start local timer
            const entry = await this.togglApi.startTimeEntry(
                this.currentWorkspaceId,
                description || '',
                projectId
            );
            this.statusBar.startTimer(entry);
            vscode.window.showInformationMessage(`Started tracking: ${description || 'No description'}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async stopTimer(): Promise<void> {
        const timerState = this.statusBar.getTimerState();
        
        if (!timerState.isRunning || !timerState.workspaceId || !timerState.entryId) {
            vscode.window.showInformationMessage('No timer running');
            return;
        }

        try {
            // Send stop request to Toggl and stop local timer
            await this.togglApi.stopTimeEntry(timerState.workspaceId, timerState.entryId);
            this.statusBar.stopTimer();
            vscode.window.showInformationMessage(`Stopped: ${timerState.description || 'No description'}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async showRecentEntries(): Promise<void> {
        const isConnected = await this.togglApi.initialize();
        
        if (!isConnected) {
            const action = await vscode.window.showQuickPick(
                ['Configure API Token'],
                { placeHolder: 'Toggl is not configured' }
            );
            if (action === 'Configure API Token') {
                await this.setApiToken();
            }
            return;
        }

        try {
            const entries = await this.togglApi.getRecentTimeEntries();
            
            if (!entries || entries.length === 0) {
                vscode.window.showInformationMessage('No recent entries found');
                return;
            }

            // Get unique descriptions
            const uniqueEntries = new Map<string, typeof entries[0]>();
            for (const entry of entries) {
                const key = `${entry.description || 'No description'}-${entry.project_id || 'no-project'}`;
                if (!uniqueEntries.has(key)) {
                    uniqueEntries.set(key, entry);
                }
            }

            const items = Array.from(uniqueEntries.values()).slice(0, 10).map(entry => ({
                label: entry.description || 'No description',
                description: entry.tags?.join(', ') || '',
                entry,
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an entry to continue',
            });

            if (selected) {
                if (!this.currentWorkspaceId) {
                    const me = await this.togglApi.getMe();
                    this.currentWorkspaceId = me.default_workspace_id;
                }

                const entry = await this.togglApi.startTimeEntry(
                    this.currentWorkspaceId,
                    selected.entry.description || '',
                    selected.entry.project_id,
                    selected.entry.tags
                );
                this.statusBar.startTimer(entry);
                vscode.window.showInformationMessage(`Continued: ${selected.entry.description || 'No description'}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get recent entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async selectWorkspace(): Promise<void> {
        try {
            this.workspaces = await this.togglApi.getWorkspaces();
            
            const items = this.workspaces.map(ws => ({
                label: ws.name,
                description: ws.id === this.currentWorkspaceId ? '(current)' : '',
                id: ws.id,
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a workspace',
            });

            if (selected) {
                this.currentWorkspaceId = selected.id;
                vscode.window.showInformationMessage(`Switched to workspace: ${selected.label}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async disconnect(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to disconnect from Toggl?',
            'Yes',
            'No'
        );

        if (confirm === 'Yes') {
            await this.togglApi.clearApiToken();
            this.statusBar.stopTimer();
            vscode.window.showInformationMessage('Disconnected from Toggl');
        }
    }
}
