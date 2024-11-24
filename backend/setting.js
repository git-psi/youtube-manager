// Name of all existing settings
const allSettings = ['selectedFolder', 'automaticUpdate', 'firstResult']

module.exports = (store, win, dialog, shell) => {
    // Function to get a setting
    async function getSetting(event, settingName) {
        if (allSettings.includes(settingName)){
            return store.get(settingName, 0);
        }else return 'Erreur'
    };

    // Function to open a folder dialog
    async function openFolderDialog() {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0]; // Retourne directement le dossier sélectionné
        }
        return null; // Si l'utilisateur annule
    };

    // Function to save settings
    async function saveSettings(event, settingsArray) {
        settingsArray.forEach(setting => {
            if (allSettings.includes(setting[0])){
                store.set(setting[0], setting[1])
            }
        });
    };

    // Function to open the folder
    async function openFolder() {
        const folderPath = store.get('selectedFolder', 0);
        if (folderPath){
            try {
                shell.openPath(folderPath);
            } catch (error) {
                console.log(error)
                return {error: 'Erreur lors de l\'ouverture du dossier'}
            }
        }else return {error: 'Aucun dossier sélectionné, voir dans les paramètres'}
    }

    return {
        getSetting,
        openFolderDialog,
        saveSettings,
        openFolder,
    }
};