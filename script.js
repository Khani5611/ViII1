document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startUploadBtn = document.getElementById('startUpload');
    const modal = document.getElementById('uploadModal');
    const closeModal = document.querySelector('.close-modal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const videoPreview = document.getElementById('videoPreview');
    const originalVideo = document.getElementById('originalVideo');
    const enhance4kBtn = document.getElementById('enhance4k');
    const enhancedVideoContainer = document.getElementById('enhancedVideoContainer');
    const enhancedVideo = document.getElementById('enhancedVideo');
    const downloadButton = document.getElementById('downloadButton');

    // Global variables
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let mediaRecorder;
    let chunks = [];
    let isProcessing = false;

    // API Configuration
    const ENHANCEMENT_API_CONFIG = {
        apiKey: window.API_CONFIG.key,
        endpoint: window.API_CONFIG.endpoints.verify,
        maxFileSize: 100 * 1024 * 1024,
        supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi']
    };

    // Initialize API at the start
    initializeAPI('73733d67-c5ac-4922-bc0a-5a9efeaa4c8a');

    // Utility functions
    function updateStatus(message, percentage = null) {
        const progressContainer = document.getElementById('enhancementProgress');
        const progressStatus = progressContainer.querySelector('.current-step');
        const progressPercentage = progressContainer.querySelector('.percentage');
        
        progressContainer.style.display = 'block';
        progressStatus.textContent = message;
        if (percentage !== null) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
    }

    function showError(message) {
        console.error(message);
        alert(message);
    }

    // File handling
    function handleFile(file) {
        if (!file) {
            showError('No file selected');
            return;
        }
        
        try {
            // Check if it's a video file
            if (!file.type.startsWith('video/')) {
                throw new Error('Please upload a video file');
            }

            // Check supported formats
            if (!ENHANCEMENT_API_CONFIG.supportedFormats.includes(file.type)) {
                throw new Error(`Unsupported format: ${file.type}. Please upload MP4, WebM, QuickTime, or AVI`);
            }

            // Check file size
            if (file.size > ENHANCEMENT_API_CONFIG.maxFileSize) {
                throw new Error(`File too large. Maximum size is ${ENHANCEMENT_API_CONFIG.maxFileSize / (1024 * 1024)}MB`);
            }

            // Create and validate video URL
            const videoURL = URL.createObjectURL(file);
            const videoElement = document.createElement('video');
            
            videoElement.onloadedmetadata = () => {
                // Clean up temporary video element
                URL.revokeObjectURL(videoURL);
                
                // Set the actual video source
                originalVideo.src = URL.createObjectURL(file);
                originalVideo.onloadedmetadata = () => {
                    dropZone.style.display = 'none';
                    videoPreview.style.display = 'block';
                    enhance4kBtn.disabled = false;
                    enhance4kBtn.style.display = 'block';
                    enhancedVideoContainer.style.display = 'none';
                };
                
                originalVideo.onerror = (e) => {
                    console.error('Video loading error:', e);
                    showError('Error loading video. Please try a different format or file.');
                };
            };

            videoElement.onerror = () => {
                URL.revokeObjectURL(videoURL);
                throw new Error('Invalid or corrupted video file');
            };

            // Start loading the video
            videoElement.src = videoURL;

        } catch (error) {
            showError(error.message);
            resetUI();
        }
    }

    // Reset UI state
    function resetUI() {
        dropZone.style.display = 'block';
        videoPreview.style.display = 'none';
        enhance4kBtn.disabled = true;
        enhance4kBtn.style.display = 'none';
        enhancedVideoContainer.style.display = 'none';
        originalVideo.src = '';
        enhancedVideo.src = '';
    }

    // Video enhancement
    async function enhanceVideo(videoBlob) {
        const formData = new FormData();
        formData.append('video', videoBlob);
        
        const loadingStates = {
            PREPARING: { text: 'Preparing for enhancement...', progress: 20 },
            LOADING: { text: 'Loading enhancement service...', progress: 40 },
            PROCESSING: { text: 'Processing video in 4K...', progress: 60 },
            FINALIZING: { text: 'Finalizing enhancement...', progress: 80 },
            COMPLETE: { text: 'Enhancement complete!', progress: 100 }
        };

        const updateLoadingState = (state) => {
            const progressBar = document.querySelector('.loading-progress');
            const loadingText = document.querySelector('.loading-text');
            if (progressBar && loadingText) {
                progressBar.textContent = `${state.progress}%`;
                loadingText.textContent = state.text;
            }
        };

        try {
            // Initial loading state
            updateStatus(loadingStates.PREPARING.text, loadingStates.PREPARING.progress);
            
            // Simulate 15-20 second initial loading
            await new Promise(resolve => setTimeout(resolve, 17000));
            
            updateStatus(loadingStates.LOADING.text, loadingStates.LOADING.progress);
            
            const response = await fetch(ENHANCEMENT_API_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'api-key': ENHANCEMENT_API_CONFIG.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(response.status === 401 ? 'Invalid API key' : `Enhancement failed: ${response.statusText}`);
            }

            // Start 5-second processing phase
            updateStatus(loadingStates.PROCESSING.text, loadingStates.PROCESSING.progress);
            await new Promise(resolve => setTimeout(resolve, 5000));

            const result = await response.json();
            
            if (!result.output_url) {
                throw new Error('No output URL received from the enhancement service');
            }

            updateStatus(loadingStates.FINALIZING.text, loadingStates.FINALIZING.progress);
            const enhancedResponse = await fetch(result.output_url);
            if (!enhancedResponse.ok) {
                throw new Error('Failed to download enhanced video');
            }

            const enhancedBlob = await enhancedResponse.blob();
            const enhancedVideo = document.getElementById('enhancedVideo');
            enhancedVideo.src = URL.createObjectURL(enhancedBlob);
            
            // Show download button after enhancement
            const downloadBtn = document.createElement('a');
            downloadBtn.className = 'download-button';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download 4K Video';
            downloadBtn.href = URL.createObjectURL(enhancedBlob);
            downloadBtn.download = 'enhanced-4k-video.mp4';
            
            const videoContainer = document.querySelector('.video-container.enhanced-video');
            videoContainer.appendChild(downloadBtn);

            enhancedVideo.onloadeddata = () => {
                updateStatus(loadingStates.COMPLETE.text, loadingStates.COMPLETE.progress);
                enhancedVideo.style.display = 'block';
            };

            return enhancedBlob;
        } catch (error) {
            showError(error.message);
            throw error;
        }
    }

    // Event Listeners
    startUploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        modal.style.display = 'block';
        console.log('Upload button clicked'); // Debug log
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    enhance4kBtn.addEventListener('click', async () => {
        if (isProcessing) return;
        isProcessing = true;
        enhance4kBtn.disabled = true;

        try {
            updateStatus('Preparing video...', 0);

            const chunks = [];
            const stream = originalVideo.captureStream();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000
            });

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            const recordingComplete = new Promise(resolve => {
                mediaRecorder.onstop = () => {
                    const videoBlob = new Blob(chunks, { type: 'video/webm' });
                    resolve(videoBlob);
                };
            });

            mediaRecorder.start();
            originalVideo.currentTime = 0;
            originalVideo.play();

            originalVideo.onended = () => {
                mediaRecorder.stop();
                originalVideo.pause();
            };

            updateStatus('Recording video...', 25);
            const videoBlob = await recordingComplete;

            updateStatus('Enhancing video...', 50);
            const enhancedBlob = await enhanceVideo(videoBlob);

            updateStatus('Finalizing...', 75);
            const enhancedVideoUrl = URL.createObjectURL(enhancedBlob);
            
            enhancedVideo.src = enhancedVideoUrl;
            enhancedVideo.onloadedmetadata = () => {
                enhancedVideoContainer.style.display = 'block';
                downloadButton.style.display = 'block';
                document.getElementById('enhancementProgress').style.display = 'none';
                isProcessing = false;
            };

            downloadButton.onclick = () => {
                const a = document.createElement('a');
                a.href = enhancedVideoUrl;
                a.download = 'enhanced_4k_video.mp4';
                a.click();
            };

            updateStatus('Enhancement complete!', 100);

        } catch (error) {
            showError(error.message);
            document.getElementById('enhancementProgress').style.display = 'none';
            enhance4kBtn.disabled = false;
            isProcessing = false;
        }
    });

    // Error handling for videos
    originalVideo.onerror = () => {
        showError('Error loading original video. Please try again.');
    };

    enhancedVideo.onerror = () => {
        showError('Error loading enhanced video. Please try the enhancement again.');
    };
});