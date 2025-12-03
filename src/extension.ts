import * as vscode from 'vscode';
import { TogglApi } from './togglApi';
import { StatusBarManager } from './statusBar';
import { CommandsManager } from './commands';

let statusBar: StatusBarManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
	console.log('OtterToggleTrack is now active!');

	const togglApi = new TogglApi(context);
	statusBar = new StatusBarManager(togglApi);
	const commands = new CommandsManager(togglApi, statusBar);

	// Initialize if API token exists
	const isConnected = await togglApi.initialize();
	if (isConnected) {
		await statusBar.startUpdating();
	}

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('ottertoggletrack.showMenu', () => commands.showMenu()),
		vscode.commands.registerCommand('ottertoggletrack.startTimer', () => commands.startTimer()),
		vscode.commands.registerCommand('ottertoggletrack.stopTimer', () => commands.stopTimer()),
		vscode.commands.registerCommand('ottertoggletrack.setApiToken', () => commands.setApiToken()),
		vscode.commands.registerCommand('ottertoggletrack.recentEntries', () => commands.showRecentEntries()),
		statusBar
	);
}

export function deactivate() {
	if (statusBar) {
		statusBar.dispose();
	}
}
