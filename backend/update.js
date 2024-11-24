const { autoUpdater } = require('electron-updater');
// Disable automatic download and installation
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

module.exports = (win, app, settingJS, Notification) => {
    autoUpdater.on('update-available', (info) => {    
        if (settingJS.getSetting(0, 'automaticUpdate')){
            // Hide the window and show a notification
            win.hide()
            new Notification({
                title: "Mise à jour",
                body: "Le logiciel se met à jour"
            }).show()
            autoUpdater.downloadUpdate()
        }else {
            // Get the current version of the application
            const currentVersion = app.getVersion();

            // Send the update information to the renderer process
            win.webContents.send('show-update', [info.releaseName, currentVersion, info.releaseNotes]);
        }
    })
    
    // Function to handle the update downloaded event
    autoUpdater.on('update-downloaded', () => {
        win.webContents.send('show-message', `L'application vas se fermer pour la mise à jour`)
        // Quit the application and install the update
        autoUpdater.quitAndInstall();
    })

    // Function to download the update
    async function update() {
        autoUpdater.downloadUpdate();
    };

    return {
        update,
        autoUpdater,
    }
};