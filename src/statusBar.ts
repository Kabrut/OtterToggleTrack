import * as vscode from 'vscode';
import { TogglTimeEntry } from './togglApi';

export interface LocalTimerState {
    isRunning: boolean;
    startTime: Date | null;
    description: string;
    projectId?: number;
    workspaceId?: number;
    entryId?: number;
    tags?: string[];
}

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private updateInterval: NodeJS.Timeout | undefined;
    private timerState: LocalTimerState = {
        isRunning: false,
        startTime: null,
        description: '',
    };

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'ottertoggletrack.showMenu';
        this.statusBarItem.show();
        this.updateDisplay();
    }

    /**
     * Start local timer (called after successful Toggl API start request)
     */
    startTimer(entry: TogglTimeEntry): void {
        this.timerState = {
            isRunning: true,
            startTime: new Date(entry.start),
            description: entry.description || 'No description',
            projectId: entry.project_id,
            workspaceId: entry.workspace_id,
            entryId: entry.id,
            tags: entry.tags,
        };
        this.startLocalUpdates();
    }

    /**
     * Stop local timer (called after successful Toggl API stop request)
     */
    stopTimer(): void {
        this.timerState = {
            isRunning: false,
            startTime: null,
            description: '',
        };
        this.stopLocalUpdates();
        this.updateDisplay();
    }

    /**
     * Start updating the status bar every second (local time only, no API calls)
     */
    private startLocalUpdates(): void {
        this.stopLocalUpdates(); // Clear any existing interval
        this.updateDisplay();
        this.updateInterval = setInterval(() => this.updateDisplay(), 1000);
    }

    /**
     * Stop the local update interval
     */
    private stopLocalUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }

    /**
     * Update the status bar display based on local timer state
     */
    private updateDisplay(): void {
        if (this.timerState.isRunning && this.timerState.startTime) {
            const duration = this.formatDuration(this.timerState.startTime);
            this.statusBarItem.text = `$(clock) ${duration} - ${this.timerState.description}`;
            this.statusBarItem.tooltip = `Toggl: Tracking "${this.timerState.description}"\nClick to show menu`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = '$(clock) Toggl: Idle';
            this.statusBarItem.tooltip = 'Toggl: Not tracking\nClick to start tracking';
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    private formatDuration(startTime: Date): string {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Check if timer is currently running
     */
    isTimerRunning(): boolean {
        return this.timerState.isRunning;
    }

    /**
     * Get current timer state
     */
    getTimerState(): LocalTimerState {
        return { ...this.timerState };
    }

    /**
     * Set error state in status bar
     */
    setError(message: string): void {
        this.statusBarItem.text = '$(clock) Toggl: Error';
        this.statusBarItem.tooltip = `Error: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    /**
     * Restore timer state from a running Toggl entry (called once at startup)
     */
    restoreFromEntry(entry: TogglTimeEntry): void {
        this.startTimer(entry);
    }

    dispose(): void {
        this.stopLocalUpdates();
        this.statusBarItem.dispose();
    }
}
