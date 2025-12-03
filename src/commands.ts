import * as vscode from 'vscode';
import { TogglApi, TogglProject, TogglWorkspace } from './togglApi';
import { StatusBarManager } from './statusBar';

export class CommandsManager {
    private togglApi: TogglApi;
    private statusBar: StatusBarManager;
    private workspaces: TogglWorkspace[] = [];
    private currentWorkspaceId: number | undefined;

    constructor(togglApi: TogglApi, statusBar: StatusBarManager) {
        this.togglApi = togglApi;
        this.statusBar = statusBar;
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
                await this.statusBar.startUpdating();
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

        const currentEntry = this.statusBar.getCurrentEntry();
        const items: vscode.QuickPickItem[] = [];

        if (currentEntry) {
            items.push({
                label: '$(debug-stop) Stop Current Timer',
                description: currentEntry.description || 'No description',
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
            const me = await this.togglApi.getMe();
            this.currentWorkspaceId = me.default_workspace_id;
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
            await this.togglApi.startTimeEntry(
                this.currentWorkspaceId,
                description || '',
                projectId
            );
            vscode.window.showInformationMessage(`Started tracking: ${description || 'No description'}`);
            await this.statusBar.update();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async stopTimer(): Promise<void> {
        const currentEntry = this.statusBar.getCurrentEntry();
        
        if (!currentEntry) {
            vscode.window.showInformationMessage('No timer running');
            return;
        }

        try {
            await this.togglApi.stopTimeEntry(currentEntry.workspace_id, currentEntry.id);
            vscode.window.showInformationMessage(`Stopped: ${currentEntry.description || 'No description'}`);
            await this.statusBar.update();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async showRecentEntries(): Promise<void> {
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

                await this.togglApi.startTimeEntry(
                    this.currentWorkspaceId,
                    selected.entry.description || '',
                    selected.entry.project_id,
                    selected.entry.tags
                );
                vscode.window.showInformationMessage(`Continued: ${selected.entry.description || 'No description'}`);
                await this.statusBar.update();
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
            this.statusBar.stopUpdating();
            vscode.window.showInformationMessage('Disconnected from Toggl');
        }
    }
}
