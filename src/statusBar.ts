import * as vscode from 'vscode';
import { TogglApi, TogglTimeEntry } from './togglApi';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private togglApi: TogglApi;
    private updateInterval: NodeJS.Timeout | undefined;
    private currentEntry: TogglTimeEntry | null = null;

    constructor(togglApi: TogglApi) {
        this.togglApi = togglApi;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'ottertoggletrack.showMenu';
        this.statusBarItem.show();
    }

    async startUpdating(): Promise<void> {
        await this.update();
        this.updateInterval = setInterval(() => this.update(), 5000);
    }

    stopUpdating(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }

    async update(): Promise<void> {
        try {
            this.currentEntry = await this.togglApi.getCurrentTimeEntry();
            
            if (this.currentEntry) {
                const duration = this.formatDuration(this.currentEntry.start);
                const description = this.currentEntry.description || 'No description';
                this.statusBarItem.text = `$(clock) ${duration} - ${description}`;
                this.statusBarItem.tooltip = `Toggl: Tracking "${description}"\nClick to show menu`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            } else {
                this.statusBarItem.text = '$(clock) Toggl: Idle';
                this.statusBarItem.tooltip = 'Toggl: Not tracking\nClick to start tracking';
                this.statusBarItem.backgroundColor = undefined;
            }
        } catch (error) {
            this.statusBarItem.text = '$(clock) Toggl: Error';
            this.statusBarItem.tooltip = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    }

    private formatDuration(startTime: string): string {
        const start = new Date(startTime);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getCurrentEntry(): TogglTimeEntry | null {
        return this.currentEntry;
    }

    dispose(): void {
        this.stopUpdating();
        this.statusBarItem.dispose();
    }
}
