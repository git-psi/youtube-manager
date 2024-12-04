module.exports = (store, BrowserWindow, win) => {
    // Get the spotify token
    let token = store.get('spotifyToken', 0)

    // Function to fetch data from Spotify
    async function spotifyFetch(url) {
        // Fetch the data from Spotify
        let res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        // If the token is invalid, generate a new one and try again
        if (res.status === 401) {
            await generateToken()
            res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        return res;
    }

    // Function to generate a spotify token
    // If forceOpen is true, force the auth window to open
    async function generateToken(forceOpen=false){
        return new Promise((resolve, reject) => {
            // Set the client ID and redirect URI
            const clientId = process.env.CLIENT_ID;
            const redirectUri = 'http://localhost/callback/spotify';
            // Set the scopes
            const scopes = 'playlist-read-private playlist-read-collaborative';
        
            const authUrl = `https://accounts.spotify.com/authorize?show_dialog=${forceOpen}&client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        
            // Create the auth window
            const authWindow = new BrowserWindow({
                width: 500,
                height: 700,
                show: false,
                webPreferences: {
                    nodeIntegration: false
                }
            });

            // If forceOpen is true, force the auth window to show
            if (forceOpen) {
                authWindow.show()
            }else {
                setTimeout(() => {
                    if (!authWindow.isDestroyed()) {
                        authWindow.show()
                    }
                }, 1000)
            }
            
            // Function to handle the redirect URL
            function redirectUrl(url){
                if (url.startsWith(redirectUri)) {
                    if (url.includes("access_token")) {
                        token = new URL(url).hash.match(/access_token=([^&]*)/)[1];
                        // Utilise le token pour les requêtes API
                        store.set('spotifyToken', token)
                        resolve(token)
                    }else if (url.includes("error")) {
                        const error = new URL(url).searchParams.get('error')
                        reject(error)
                    }
                    authWindow.close();
                }
            }

            // Check the URL every second
            const urlCheckInterval = setInterval(() => {
                redirectUrl(authWindow.webContents.getURL())
            }, 100);

            // Clean the interval when the window is closed
            authWindow.on('closed', () => {
                clearInterval(urlCheckInterval);
            });
        
            authWindow.webContents.on('will-redirect', (event, url) => {
                redirectUrl(url)
            });
            authWindow.loadURL(authUrl);
        });
    }

    // Function to fetch the user's playlists
    async function fetchUserPlaylists() {
        try {
            await generateToken()

            const playlistsData = [];
        
            // Get liked tracks
            const likedRes = await spotifyFetch('https://api.spotify.com/v1/me/tracks');
            const likedTracks = await likedRes.json();

            playlistsData.push({
                infoName: "Titres likés",
                infoThumbnail: "https://misc.scdn.co/liked-songs/liked-songs-640.png",
                infoNumTracks: likedTracks.total,
                infoHref: 'https://api.spotify.com/v1/me/tracks',
                infoEmbed: false,
            });

            // Get all user playlists
            const res = await spotifyFetch('https://api.spotify.com/v1/me/playlists');
            const playlists = await res.json();

            // For each playlist, get track details
            for (const playlist of playlists.items) {
                if (!playlist) continue;
                
                const embedUrl = `https://open.spotify.com/embed/playlist/${playlist.id}`;
                playlistsData.push({
                    infoName: playlist.name,
                    infoThumbnail: playlist.images[0]?.url || "",
                    infoNumTracks: playlist.tracks.total,
                    infoHref: playlist.tracks.href,
                    infoEmbed: embedUrl,
                });
            }
        
            return playlistsData;
        } catch (error) {
            console.error("Erreur lors de la recuperation des playlists:", error);
            throw error;
        }
    }

    // Function to fetch the tracks of a playlist
    async function fetchPlaylistTracks(event, href) {
        let offset = 0;
        const limit = 50; // Maximum autorisé par Spotify
        
        while (true) {
            // Ajouter les paramètres limit et offset à l'URL
            const paginatedHref = `${href}?limit=${limit}&offset=${offset}`;
            const res = await spotifyFetch(paginatedHref);
            const data = await res.json();
            
            // Ajouter les tracks de la page courante
            const tracks = [];
            for (const item of data.items) {
                const track = item.track;
                if (track) {
                    tracks.push({
                        title: track.name,
                        author: track.artists.map(artist => artist.name).join(', '),
                        search: `${track.name} ${track.artists[0].name}`
                    });
                }
            }
            win.webContents.send('add-spotify-playlist-tracks', tracks)
            
            // Si on a récupéré tous les tracks, on sort de la boucle
            if (data.items.length < limit || tracks.length >= data.total) {
                break;
            }
            
            // Sinon on passe à la page suivante
            offset += limit;
        }
    }

    return {
        generateToken,
        fetchUserPlaylists,
        fetchPlaylistTracks,
    }
};