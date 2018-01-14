const Main           = imports.ui.main;
const Meta           = imports.gi.Meta;
const Mainloop       = imports.mainloop;
const Panel          = Main.panel;
const AppMenu        = Panel.statusArea.appMenu;
const St             = imports.gi.St;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var WindowButtons = new Lang.Class({
  Name: 'Unite.WindowButtons',
  _wmHandlerIDs: [],
  _ovHandlerIDs: [],

  _init: function() {
    [this._position, this._buttons] = Helpers.getWindowButtons();

    Mainloop.idle_add(Lang.bind(this, this._createButtons));
    Mainloop.idle_add(Lang.bind(this, this._updateVisibility));

    this._connectSignals();
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateVisibility)
    );

    this._ovHandlerIDs.push(Main.overview.connect(
      'showing', Lang.bind(this, this._updateVisibility)
    ));

    this._ovHandlerIDs.push(Main.overview.connect(
      'hidden', Lang.bind(this, this._updateVisibility)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'destroy', Lang.bind(this, this._updateVisibility)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'size-change', Lang.bind(this, this._updateVisibility)
    ));
  },

  _createButtons: function () {
    if (this._buttons) {
      this._buttonsActor = new St.Bin();
      this._buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

      this._buttonsActor._windowButtons = true;

      this._buttonsActor.add_actor(this._buttonsBox);
      this._buttonsActor.hide();

      this._buttons.forEach(Lang.bind(this, function (action) {
        let button = new St.Button({ style_class: action  + ' window-button', track_hover: true });

        button._windowAction = action;
        button.connect('clicked', Lang.bind(this, this._onButtonClick));

        this._buttonsBox.add(button);
      }));

      if (this._position == 'left') {
        let appmenu = Main.panel.statusArea.appMenu.actor.get_parent();
        Panel._leftBox.insert_child_below(this._buttonsActor, appmenu);
      }

      if (this._position == 'right') {
        let index = Panel._rightBox.get_n_children() + 1;
        Panel._rightBox.insert_child_at_index(this._buttonsActor, index);
      }
    }
  },

  _destroyButtons: function () {
    if (this._buttonsActor) {
      this._buttonsActor.destroy();
    }

    if (this._buttonsBox) {
      this._buttonsBox.destroy();
    }
  },

  _onButtonClick: function (actor, evt) {
    switch (actor._windowAction) {
      case 'minimize':
        this._minimizeWindow();
        break;
      case 'maximize':
        this._maximizeWindow();
        break;
      case 'close':
        this._closeWindow();
        break;
    }
  },

  _minimizeWindow: function () {
    if (this._activeWindow && !this._activeWindow.minimized) {
      this._activeWindow.minimize();
    }
  },

  _maximizeWindow: function () {
    if (this._activeWindow) {
      if (this._activeWindow.get_maximized() === MAXIMIZED) {
        this._activeWindow.unmaximize(MAXIMIZED);
      } else {
        this._activeWindow.maximize(MAXIMIZED);
      }
    }
  },

  _closeWindow: function () {
    if (this._activeWindow) {
      this._activeWindow.delete(global.get_current_time());
    }
  },

  _updateVisibility: function () {
    this._activeWindow = global.display.focus_window;

    if (this._buttonsActor) {
      let visible = AppMenu._visible;

      if (!Main.overview.visible) {
        visible = Helpers.isMaximized(this._activeWindow);
      }

      if (visible) {
        this._buttonsActor.show();
      } else {
        this._buttonsActor.hide();
      }
    }
  },

  destroy: function() {
    let handlers = Helpers.overviewSignalIDs();

    this._ovHandlerIDs.forEach(function (handler) {
      if (handlers.indexOf(handler) > -1) {
        Main.overview.disconnect(handler);
      }
    });

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });

    global.display.disconnect(this._dsHandlerID);

    Mainloop.idle_add(Lang.bind(this, this._destroyButtons));
  }
});
