// @flow
import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import log from 'electron-log';
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import TrayIconManager from './lib/tray-icon-manager';
import ElectronSudo from 'electron-sudo';

import type { TrayIconType } from './lib/tray-icon-manager';

const isDevelopment = (process.env.NODE_ENV === 'development');
const isMacOS = (process.platform === 'darwin');
const isLinux = (process.platform === 'linux');
const isWindows = (process.platform === 'win32');

const rpcAddressFile = isMacOS || isLinux
  ? path.join('/tmp', '.mullvad_rpc_address')
  : path.join(app.getPath('temp'), '.mullvad_rpc_address');

let browserWindowReady = false;


const appDelegate = {
  _window: (null: ?BrowserWindow),
  _tray: (null: ?Tray),
  _logFileLocation: '',
  connectionFilePollInterval: (null: ?number),

  setup: () => {
    // Override appData path to avoid collisions with old client
    // New userData path, i.e on macOS: ~/Library/Application Support/mullvad.vpn
    app.setPath('userData', path.join(app.getPath('appData'), 'mullvad.vpn'));

    appDelegate._logFileLocation = app.getPath('userData');
    appDelegate._initLogging();

    appDelegate._startBackend();

    app.on('window-all-closed', () => appDelegate.onAllWindowsClosed());
    app.on('ready', () => appDelegate.onReady());
  },
  _initLogging: () => {

    const format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}][{level}] {text}';
    log.transports.console.format = format;
    log.transports.file.format = format;
    if (isDevelopment) {
      log.transports.console.level = 'debug';

      // Disable log file in development
      log.transports.file.level = false;
    } else {
      log.transports.console.level = 'info';
      log.transports.file.level = 'info';
      log.transports.file.file = path.join(appDelegate._logFileLocation, 'frontend.log');

      // create log folder
      mkdirp.sync(appDelegate._logFileLocation);
    }

  },

  onReady: async () => {
    const window = appDelegate._window = appDelegate._createWindow();

    ipcMain.on('on-browser-window-ready', () => {
      browserWindowReady = true;
      appDelegate._pollForConnectionInfoFile();
    });

    window.loadURL('file://' + path.join(__dirname, 'index.html'));

    // create tray icon on macOS
    if(isMacOS) {
      appDelegate._tray = appDelegate._createTray(window);
    }

    appDelegate._setAppMenu();
    appDelegate._addContextMenu(window);

    if(isDevelopment) {
      await appDelegate._installDevTools();
      window.openDevTools({ mode: 'detach' });
    }
  },

  onAllWindowsClosed: () => {
    app.quit();
  },

  _startBackend: () => {

    const backendIsRunning = appDelegate._rpcAddressFileExists();
    if (backendIsRunning) {
      log.info('Not starting the backend as it appears to already be running');
      return;
    }

    const pathToBackend = appDelegate._findPathToBackend();
    log.info('Starting the mullvad backend at', pathToBackend);

    const options = {
      name: 'Mullvad',
    };
    const sudo = new ElectronSudo(options);
    sudo.spawn( pathToBackend, ['-vv --log "' + path.join(appDelegate._logFileLocation, 'backend.log"')] )
      .then( p => {
        appDelegate._setupBackendProcessListeners(p);
        return p;
      });
  },
  _rpcAddressFileExists: () => {
    return fs.existsSync(rpcAddressFile);
  },
  _findPathToBackend: () => {
    if (isDevelopment) {
      return path.resolve(process.env.MULLVAD_BACKEND || '../talpid_core/target/debug/mullvadd');

    } else if (isMacOS || isLinux) {
      return path.join(process.resourcesPath, 'mullvadd');

    } else if (isWindows) {
      // TODO: Decide
      return '';
    }
  },
  _setupBackendProcessListeners: (p) => {
    // electron-sudo writes all output to some buffers in memory.
    // For long-running processes such as this one that would
    // cause a memory leak.
    p.stdout.removeAllListeners('data');
    p.stderr.removeAllListeners('data');

    p.stdout.on('data', (data) => {
      console.log('BACKEND stdout:', data.toString());
    });
    p.stderr.on('data', (data) => {
      console.warn('BACKEND stderr:', data.toString());
    });

    p.on('error', (err) => {
      log.error('Failed to start or kill the backend', err);
    });

    p.on('exit', (code) => {
      const timeoutMs = 500;
      log.info('The backend exited with code', code + '. Attempting to restart it in', timeoutMs, 'milliseconds...');
      setTimeout( () => appDelegate._startBackend(), timeoutMs);
    });
  },
  _pollForConnectionInfoFile: () => {

    if (appDelegate.connectionFilePollInterval) {
      log.warn('Attempted to start polling for the RPC connection info file while another polling was already running');
      return;
    }

    const pollIntervalMs = 200;
    appDelegate.connectionFilePollInterval = setInterval(() => {

      if (browserWindowReady && appDelegate._rpcAddressFileExists()) {

        if (appDelegate.connectionFilePollInterval) {
          clearInterval(appDelegate.connectionFilePollInterval);
          appDelegate.connectionFilePollInterval = null;
        }

        appDelegate._sendBackendInfo();
      }

    }, pollIntervalMs);
  },
  _sendBackendInfo: () => {
    const window = appDelegate._window;
    if (!window) {
      log.error('Attempted to send backend rpc address before the window was ready');
      return;
    }

    log.debug('Reading the ipc connection info from', rpcAddressFile);

    fs.readFile(rpcAddressFile, 'utf8', function (err, data) {
      if (err) {
        return log.error('Could not find backend connection info', err);
      }

      log.info('Read IPC connection info', data);
      window.webContents.send('backend-info', {
        addr: data,
      });
    });
  },

  _installDevTools: async () => {
    const installer = require('electron-devtools-installer');
    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    for(const name of extensions) {
      try {
        await installer.default(installer[name], forceDownload);
      } catch (e) {
        log.info(`Error installing ${name} extension: ${e.message}`);
      }
    }
  },

  _createWindow: (): BrowserWindow => {
    const contentHeight = 568;
    let options = {
      width: 320,
      height: contentHeight,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        // prevents renderer process code from not running when window is hidden
        backgroundThrottling: false,
        // Enable experimental features
        blinkFeatures: 'CSSBackdropFilter'
      }
    };

    // setup window flags to mimic popover on macOS
    if(isMacOS) {
      options = Object.assign({}, options, {
        height: contentHeight + 12, // 12 is the size of transparent area around arrow
        frame: false,
        transparent: true,
        show: false
      });
    }

    return new BrowserWindow(options);
  },

  _setAppMenu: () => {
    const template = [
      {
        label: 'Mullvad',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { type: 'separator' },
          { role: 'selectall' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  },

  _addContextMenu: (window: BrowserWindow) => {
    let menuTemplate = [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectall' }
    ];

    // add inspect element on right click menu
    window.webContents.on('context-menu', (_e: Event, props: { x: number, y: number }) => {
      let inspectTemplate = [{
        label: 'Inspect element',
        click() {
          window.openDevTools({ mode: 'detach' });
          window.inspectElement(props.x, props.y);
        }
      }];

      if(props.isEditable) {
        let inputMenu = menuTemplate;

        // mixin 'inspect element' into standard menu when in development mode
        if(isDevelopment) {
          inputMenu = menuTemplate.concat([{type: 'separator'}], inspectTemplate);
        }

        Menu.buildFromTemplate(inputMenu).popup(window);
      } else if(isDevelopment) {
        // display inspect element for all non-editable
        // elements when in development mode
        Menu.buildFromTemplate(inspectTemplate).popup(window);
      }
    });
  },

  _toggleWindow: (window: BrowserWindow, tray: ?Tray) => {
    if(window.isVisible()) {
      window.hide();
    } else {
      appDelegate._showWindow(window, tray);
    }
  },

  _showWindow: (window: BrowserWindow, tray: ?Tray) => {
    // position window based on tray icon location
    if(tray) {
      const { x, y } = appDelegate._getWindowPosition(window, tray);
      window.setPosition(x, y, false);
    }

    window.show();
    window.focus();
  },

  _getWindowPosition: (window: BrowserWindow, tray: Tray): { x: number, y: number } => {
    const windowBounds = window.getBounds();
    const trayBounds = tray.getBounds();

    // center window horizontally below the tray icon
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));

    // position window vertically below the tray icon
    const y = Math.round(trayBounds.y + trayBounds.height);

    return { x, y };
  },

  _createTray: (window: BrowserWindow): Tray => {
    const tray = new Tray(nativeImage.createEmpty());
    tray.setHighlightMode('never');
    tray.on('click', () => appDelegate._toggleWindow(window, tray));

    // setup NSEvent monitor to fix inconsistent window.blur
    // see https://github.com/electron/electron/issues/8689
    const { NSEventMonitor, NSEventMask } = require('nseventmonitor');
    const trayIconManager = new TrayIconManager(tray, 'unsecured');
    const macEventMonitor = new NSEventMonitor();
    const eventMask = NSEventMask.leftMouseDown | NSEventMask.rightMouseDown;

    // add IPC handler to change tray icon from renderer
    ipcMain.on('changeTrayIcon', (_: Event, type: TrayIconType) => trayIconManager.iconType = type);

    // setup event handlers
    window.on('show', () => macEventMonitor.start(eventMask, () => window.hide()));
    window.on('hide', () => macEventMonitor.stop());
    window.on('close', () => window.closeDevTools());
    window.on('blur', () => !window.isDevToolsOpened() && window.hide());

    return tray;
  }
};

appDelegate.setup();
