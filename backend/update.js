const { autoUpdater } = require('electron-updater');
// Disable automatic download and installation
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

module.exports = (win, app, settingJS, Notification) => {
    autoUpdater.on('update-available', (info) => {    
        console.log('update-available')
        console.log(settingJS.getSetting(0, 'automaticUpdate'))
        if (settingJS.getSetting(0, 'automaticUpdate')){
            console.log('automaticUpdate is true')
            // Hide the window and show a notification
            win.hide()
            new Notification({
                title: "Mise à jour",
                body: "Le logiciel se met à jour"
            }).show()
            console.log('downloading update')
            autoUpdater.downloadUpdate()
            console.log('update downloaded')
        }else {
            console.log('automaticUpdate is false')
            // Get the current version of the application
            const currentVersion = app.getVersion();

            // Send the update information to the renderer process
            win.webContents.send('show-update', [info.releaseName, currentVersion, info.releaseNotes]);
        }
    })
    
    // Function to handle the update downloaded event
    autoUpdater.on('update-downloaded', () => {
        console.log('update-downloaded')
        win.webContents.send('show-message', `L'application vas se fermer pour la mise à jour`)
        console.log('quitting and installing')
        // Quit the application and install the update
        autoUpdater.quitAndInstall();
        console.log('update installed')
    })

    // Function to download the update
    async function update() {
        console.log('downloading update')
        autoUpdater.downloadUpdate();
        console.log('update downloaded')
    };

    return {
        update,
        autoUpdater,
    }
};