// Require all modules
const fs = require('fs');
const axios = require('axios');
const ytdl = require("@distube/ytdl-core");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath)

module.exports = (store, path) => {
    // Set ffmpeg path
    const ffmpegExecutable = ffmpegPath.includes('app.asar')
        ? ffmpegPath.replace('app.asar', 'app.asar.unpacked')
        : ffmpegPath;
    ffmpeg.setFfmpegPath(ffmpegExecutable);

    async function downloadMusic(event, url, title, thumbnail_url, author, format){
        // Set format to mp3 if it's not mp3 or mp4
        if (format != "mp3" && format != "mp4"){format="mp3"}
        // Get the download path
        let downloadPath= store.get('selectedFolder', 0)
        if (!downloadPath){
            return { error: "Veillez choisir, dans les paramètres, un dossier ou stocker les fichiers téléchargés" };
        }else if (!fs.existsSync(downloadPath)){
            return { error: "Le dossier choisi pour stocker les fichiers téléchargés n'existe pas" };
        }
    
        // Try to download the music
        try {
            // Replace all forbidden characters in the title
            title = title.replace('/[\\/:*?"<>|]/g', '')
            // Set the download path
            const fileDownloadPath = path.join(downloadPath, `${title}.${format}`);
            // Set the temporary download path
            const downloadTempPath = fileDownloadPath.replace(`.${format}`, `-temp.${format}`);
            // Set the thumbnail path
            const thumbnailPath = path.join(downloadPath, 'thumbnail-temp.jpg');
            // Download the thumbnail
            await downloadThumbnail(thumbnail_url, thumbnailPath);
        
            // Download the music
            if (format == "mp3"){
                const audioStream = ytdl(url, { quality: 'highestaudio' });
                const audioFile = fs.createWriteStream(downloadTempPath);
                audioStream.pipe(audioFile);
                await new Promise((resolve, reject) => {
                    audioFile.on('finish', resolve);
                    audioFile.on('error', reject);
                });
        
                // Add metadata to the music
                await addMetadata(fileDownloadPath, downloadTempPath, thumbnailPath, author);
                // Delete the thumbnail and the temporary file
                fs.unlink(thumbnailPath, (err) => {
                if (err) {
                    console.log('Erreur lors du remplacement du fichier original: ' + err);
                }});
                fs.unlink(downloadTempPath, (err) => {
                if (err) {
                    console.log('Erreur lors du remplacement du fichier original: ' + err);
                }});
            // If the format is mp4
            }else {
                // Set the temporary download path for the audio
                const downloadTempPathAudio = fileDownloadPath.replace(`.mp4`, `-temp.audio.m4a`);
                // Set the temporary download path for the video
                const downloadTempPathVideo = fileDownloadPath.replace(`.mp4`, `-temp.video.mp4`);

                // Download the video
                const videoStream = ytdl(url, { filter: 'videoonly', quality: 'highestvideo', format: 'mp4' });
                const videoFile = fs.createWriteStream(downloadTempPathVideo);
                videoStream.pipe(videoFile);
                await new Promise((resolve, reject) => {
                    videoFile.on('finish', resolve);
                    videoFile.on('error', reject);
                });

                // Download the audio
                const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
                const audioFile = fs.createWriteStream(downloadTempPathAudio);
                audioStream.pipe(audioFile);
                await new Promise((resolve, reject) => {
                    audioFile.on('finish', resolve);
                    audioFile.on('error', reject);
                });
            
                // Merge the audio and the video
                await mergeAudioAndVideo(fileDownloadPath, downloadTempPathVideo, downloadTempPathAudio, thumbnailPath, author);
                
                // Delete the thumbnail and the temporary files
                fs.unlink(thumbnailPath, (err) => {
                if (err) {
                    console.log('Erreur lors du remplacement du fichier original: ' + err);
                }});
                fs.unlink(downloadTempPathVideo, (err) => {
                if (err) {
                    console.log('Erreur lors du remplacement du fichier original: ' + err);
                }});
                fs.unlink(downloadTempPathAudio, (err) => {
                if (err) {
                    console.log('Erreur lors du remplacement du fichier original: ' + err);
                }});
            }
        
            // Return success
            return { success: true };
        } catch (error) {
            // Return error
            console.log(error);
            return { error: 1 };
        }
    };
    
    // Function to add metadata to the music
    async function addMetadata(filePath, fileTempPath, thumbnailPath, author){
        return new Promise((resolve, reject) => {
        ffmpeg(fileTempPath)
            .input(thumbnailPath)
            .outputOptions('-map', '0', '-map', '1')
            .outputOptions('-metadata', `artist=${author}`)
            .outputOptions('-id3v2_version', '3')
            .save(filePath)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                console.log(err)
                reject(err);
            });
        });
    }
    
    // Function to merge the audio and the video
    async function mergeAudioAndVideo(filePath, videoPath, audioPath, thumbnailPath, author){
        return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .input(thumbnailPath)
            .outputOptions('-metadata', `artist=${author}`)
            .outputOptions('-id3v2_version', '3')
            .outputOptions('-c:v', 'copy')  // Copy the video codec without re-encoding
            .outputOptions('-c:a', 'aac')  // Encode audio to AAC
            .save(filePath)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                console.log(err)
                reject(err);
            });
        });
    }
    
    // Function to download the thumbnail
    async function downloadThumbnail(thumbnailUrl, savePath) {
        const writer = fs.createWriteStream(savePath);
        const response = await axios({
        url: thumbnailUrl,
        method: 'GET',
        responseType: 'stream'
        });
    
        response.data.pipe(writer);
    
        return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        });
    }

    return {
        downloadMusic,
    }
};