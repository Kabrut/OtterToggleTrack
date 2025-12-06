import * as vscode from 'vscode';
import { TogglApi } from './togglApi';
import { StatusBarManager } from './statusBar';
import { CommandsManager } from './commands';

let statusBar: StatusBarManager | undefined;
let commandsManager: CommandsManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
	console.log('OtterTogglTrack is now active!');

	const togglApi = new TogglApi(context);
	statusBar = new StatusBarManager();
	commandsManager = new CommandsManager(togglApi, statusBar);

	// Initialize - check for running timer once at startup and start periodic sync
	await commandsManager.initialize();

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('ottertoggletrack.showMenu', () => commandsManager!.showMenu()),
		vscode.commands.registerCommand('ottertoggletrack.startTimer', () => commandsManager!.startTimer()),
		vscode.commands.registerCommand('ottertoggletrack.stopTimer', () => commandsManager!.stopTimer()),
		vscode.commands.registerCommand('ottertoggletrack.setApiToken', () => commandsManager!.setApiToken()),
		vscode.commands.registerCommand('ottertoggletrack.recentEntries', () => commandsManager!.showRecentEntries()),
		statusBar
	);
}

export function deactivate() {
	if (commandsManager) {
		commandsManager.stopPeriodicSync();
	}
	if (statusBar) {
		statusBar.dispose();
	}
}
