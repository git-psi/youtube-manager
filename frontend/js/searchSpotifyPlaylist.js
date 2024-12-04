const tracksToAdd = []
let addingTracks = false

// Show and search Spotify playlists
async function showSpotifyPlaylists() {
    try {
        // Show the search modal
        searchModalObject.show()
        
        // Set the modal title
        searchModalTitle.innerText = "Playlists Spotify"
        // Clear any existing search results
        deleteSearchResults()
        
        // Fetch playlists from Spotify via the backend
        const playlists = await window.electronAPI.spotifyFetchPlaylists()
        
        if (playlists.length === 0) {
            showSearchModalMessage("Aucune playlist trouvée dans votre bibliothèque Spotify.")
            return;
        }

        playlists.forEach(playlist => {
            // Destructure playlist info
            const { infoName, infoThumbnail, infoNumTracks, infoHref, infoEmbed } = playlist;

            // Create playlist result item element
            const resultItem = document.createElement('div');
            resultItem.className = 'result w-100 bg-body-secondary rounded-2 p-2 d-flex flex-row align-items-center overflow-hidden position-relative';
            resultItem.style = 'height: 90px;'
            resultItem.innerHTML = `
                <div class="h-100 position-relative">
                    <img src="${infoThumbnail}" class="h-100 rounded">
                    <button class="viewPlaylistBtn border-0 position-absolute top-0 bottom-0 start-0 end-0 bg-black center thumbnailHover rounded">
                        <i class="bi-play-circle text-white fs-1 pe-none"></i>
                    </button>
                </div>
                <div class="w-100 d-flex flex-column overflow-hidden ms-2">
                    <p class="text-truncate mb-0 fw-semibold">${infoName}</p>
                    <p class="text-truncate mb-0 text-secondary" style="letter-spacing: -0.5px; font-size: 14px;">${infoNumTracks} titres</p>
                </div>
                <button class="addPlaylistBtn btn music-item-download-btn btn-primary p-0 ms-3" style="min-height: 38px; min-width: 38px;"><i class="bi bi-plus-circle fs-5"></i></button>`

            // Add click handler for the add playlist button
            const addPlaylistBtn = resultItem.querySelector('.addPlaylistBtn')
            addPlaylistBtn.addEventListener('click', async () => {
                // Hide search modal
                searchModalObject.hide()
                // Fetch tracks for this playlist
                window.electronAPI.spotifyFetchPlaylistTracks(infoHref)
                
                // Clear search results
                deleteSearchResults()
            })

            // Add click handler for the view playlist button if embed URL exists
            const viewPlaylistBtn = resultItem.querySelector('.viewPlaylistBtn')
            if (infoEmbed) {
                viewPlaylistBtn.addEventListener('click', () => {
                    // Set the Spotify iframe source
                    spotifyFrame.setAttribute("src", infoEmbed);
                    // Flag to return to search modal when closing
                    returnToSearchModal = true;
                    // Show Spotify modal and hide search modal
                    spotifyModalObject.show();
                    searchModalObject.hide()
                })
            }else {
                // Remove view button if no embed URL
                viewPlaylistBtn.remove()
            }

            // Add the playlist item to results
            allResults.appendChild(resultItem)
        });
        
        showSearchModalMessage("Si vous n'arrivez pas à trouver la playlist que vous cherchez, c'est qu'elle n'est pas dans votre bibliothèque Spotify.")
    } catch (error) {
        console.error("Erreur lors de l'affichage des playlists:", error);
        searchModalObject.hide();
        createAlert("Erreur lors de la récupération des playlists Spotify. Veuillez vérifier votre connexion.", "danger");
    }
}

window.electronAPI.addSpotifyPlaylistTracks(async (event, tracks) => {
    tracksToAdd.push(tracks)
    if (!addingTracks) {
        while (tracksToAdd.length > 0) {
            addingTracks = true
            const tracks = tracksToAdd.shift()
            for (const track of tracks) {
                const { title, author, search } = track
                const musicItem = new MusicItem("", title, author)
                await musicItem.setFromSearch(search)
            }
        }
        addingTracks = false
    }
})