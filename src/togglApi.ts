import * as vscode from 'vscode';

const TOGGL_API_URL = 'https://api.track.toggl.com/api/v9';

export interface TogglTimeEntry {
    id: number;
    workspace_id: number;
    project_id?: number;
    description?: string;
    start: string;
    stop?: string;
    duration: number;
    tags?: string[];
}

export interface TogglProject {
    id: number;
    name: string;
    workspace_id: number;
    color: string;
    active: boolean;
}

export interface TogglWorkspace {
    id: number;
    name: string;
}

export class TogglApi {
    private apiToken: string | undefined;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async initialize(): Promise<boolean> {
        this.apiToken = await this.context.secrets.get('toggl-api-token');
        return !!this.apiToken;
    }

    async setApiToken(token: string): Promise<void> {
        await this.context.secrets.store('toggl-api-token', token);
        this.apiToken = token;
    }

    async clearApiToken(): Promise<void> {
        await this.context.secrets.delete('toggl-api-token');
        this.apiToken = undefined;
    }

    private getAuthHeader(): string {
        return 'Basic ' + Buffer.from(`${this.apiToken}:api_token`).toString('base64');
    }

    private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
        if (!this.apiToken) {
            throw new Error('API token not configured');
        }

        const response = await fetch(`${TOGGL_API_URL}${endpoint}`, {
            method,
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Toggl API error: ${response.status} - ${error}`);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json() as Promise<T>;
    }

    async getMe(): Promise<{ id: number; email: string; fullname: string; default_workspace_id: number }> {
        return this.request('GET', '/me');
    }

    async getWorkspaces(): Promise<TogglWorkspace[]> {
        return this.request('GET', '/workspaces');
    }

    async getProjects(workspaceId: number): Promise<TogglProject[]> {
        return this.request('GET', `/workspaces/${workspaceId}/projects`);
    }

    async getCurrentTimeEntry(): Promise<TogglTimeEntry | null> {
        return this.request('GET', '/me/time_entries/current');
    }

    async startTimeEntry(
        workspaceId: number, 
        description: string, 
        projectId?: number,
        tags?: string[]
    ): Promise<TogglTimeEntry> {
        const now = new Date().toISOString();
        return this.request('POST', `/workspaces/${workspaceId}/time_entries`, {
            description,
            project_id: projectId,
            tags,
            start: now,
            duration: -1,
            created_with: 'OtterToggleTrack VS Code Extension',
            workspace_id: workspaceId,
        });
    }

    async stopTimeEntry(workspaceId: number, timeEntryId: number): Promise<TogglTimeEntry> {
        return this.request('PATCH', `/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`, {});
    }

    async getRecentTimeEntries(): Promise<TogglTimeEntry[]> {
        return this.request('GET', '/me/time_entries');
    }
}
