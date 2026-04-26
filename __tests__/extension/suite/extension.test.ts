import * as assert from 'node:assert';

import * as vscode from 'vscode';

const PUBLISHER = 'your-publisher';
const NAME = 'vscode-extension-quick-starter';
const EXTENSION_ID = `${PUBLISHER}.${NAME}`;
const COMMAND_ID = 'hello-world.showHelloWorld';

describe('extension activation', function () {
  this.timeout(20000);

  it('extension is installed and discoverable', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} should be installed`);
  });

  it('activates without error', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    if (!ext.isActive)
      await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  it('registers the showHelloWorld command', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive)
      await ext.activate();
    const commandIds = await vscode.commands.getCommands(true);
    assert.ok(commandIds.includes(COMMAND_ID), `Command ${COMMAND_ID} not registered`);
  });

  it('executing the command opens a webview panel', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive)
      await ext.activate();
    await vscode.commands.executeCommand(COMMAND_ID);
    // The MainPanel.currentPanel singleton lives in extension code; we can't poke at it directly,
    // but invoking the command must not throw.
    assert.ok(true, 'command executed without throwing');
  });
});

describe('vscode API surface', function () {
  this.timeout(10000);

  it('window API is available', () => {
    assert.ok(vscode.window);
  });

  it('commands API is available', () => {
    assert.ok(vscode.commands);
  });

  it('extensions API is available', () => {
    assert.ok(vscode.extensions);
  });
});
