// The modal that appear when you want to quit the app
const quitAppModal = document.getElementById('quitAppModal');
const quitAppModalObject = new bootstrap.Modal(quitAppModal)
const quitAppBtn = document.getElementById('quitAppBtn')

// When the quit app button is clicked, quit the app
quitAppBtn.addEventListener('click', () => {
    window.electronAPI.quitApp()
})

// When the app want to quit, check if there is a music item or a downloading music item
window.electronAPI.wantQuitApp(() => {
    try {
        if (musicList.querySelector('.music-item') || downloadQueueList.querySelector('.download-music')){
            // Store the currently open modal before closing it
            let openModal = null;
            document.querySelectorAll('.modal.show').forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    openModal = modalInstance;
                    // Hide modal without triggering events
                    modalInstance._element.classList.remove('show');
                    modalInstance._element.style.display = 'none';
                    modalInstance._element.setAttribute('aria-hidden', 'true');
                    modalInstance._isShown = false;
                }
            });
            
            // Show quit confirmation modal
            quitAppModalObject.show();
            window.electronAPI.focusApp();

            // Add event listener to reopen the previous modal when quit modal is hidden
            quitAppModal.addEventListener('hidden.bs.modal', () => {
                if (openModal && openModal !== quitAppModalObject) {
                    openModal.show();
                }
            }, { once: true });
        } else {
            window.electronAPI.quitApp();
        }
    } catch (error) {
        console.log(error);
    }
})