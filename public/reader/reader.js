class BookReader {
    constructor() {
        this.currentPage = 0; // 0 = cover
        this.bookData = null;
        this.totalPages = 0;
        this.isAuthenticated = false;
        this.isFullscreen = false;
        this.isReading = false; // Track if user has started reading
        this.keydownHandler = null; // Track keyboard handler
        this.clickHandler = null; // Track click handler
        this.wheelHandler = null; // Track wheel handler
        this.isNavigating = false; // Prevent rapid navigation
        
        // Audio properties
        this.audioEnabled = false;
        this.audioElement = new Audio();
        this.hasAudio = false; // Track if current book has audio
        
        this.init();
    }

    async init() {
        // Check if already authenticated
        if (sessionStorage.getItem('readerAuth') === 'true') {
            this.isAuthenticated = true;
            
            // Always check if a book is specified in URL
            const urlParams = new URLSearchParams(window.location.search);
            const bookParam = urlParams.get('book');
            
            if (bookParam) {
                // Book specified, go directly to reading mode cover
                this.showReader();
                await this.loadBookData();
                this.isReading = true; // Start in reading mode
                this.showReadingMode();
                this.setupEventListeners();
                this.updateDisplay();
            } else {
                // No book specified, show book selection
                this.showBookSelection();
            }
        } else {
            this.showAuthModal();
        }
    }

    showAuthModal() {
        document.getElementById('authModal').style.display = 'flex';
        document.getElementById('bookSelectionModal').style.display = 'none';
        document.getElementById('readerContainer').style.display = 'none';
        
        // Setup auth form
        document.getElementById('authForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });
    }

    showBookSelection() {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('bookSelectionModal').style.display = 'flex';
        document.getElementById('readerContainer').style.display = 'none';
        
        // Setup book selection buttons
        document.querySelectorAll('.select-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookOption = e.target.closest('.book-option');
                const bookId = bookOption.getAttribute('data-book');
                this.selectBook(bookId);
            });
        });
    }

    selectBook(bookId) {
        // Update URL with book parameter
        const url = new URL(window.location);
        url.searchParams.set('book', bookId);
        window.history.replaceState({}, '', url);
        
        // Reset current page and reading state
        this.currentPage = 0;
        this.isReading = true; // Start in reading mode
        
        // Load the selected book
        this.showReader();
        this.loadBookData().then(() => {
            this.showReadingMode();
            this.setupEventListeners();
            this.updateDisplay();
        });
    }

    showReader() {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('bookSelectionModal').style.display = 'none';
        document.getElementById('readerContainer').style.display = 'flex';
    }

    handleAuth() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('authError');
        
        // Simple authentication (replace with your actual auth logic)
        if (username === 'teacher' && password === 'password123') {
            this.isAuthenticated = true;
            sessionStorage.setItem('readerAuth', 'true');
            errorDiv.textContent = '';
            
            // Check if a book is specified in URL
            const urlParams = new URLSearchParams(window.location.search);
            const bookParam = urlParams.get('book');
            
            if (bookParam) {
                // Book specified, go directly to reading mode cover
                this.showReader();
                this.loadBookData().then(() => {
                    this.isReading = true; // Start in reading mode
                    this.showReadingMode();
                    this.setupEventListeners();
                    this.updateDisplay();
                });
            } else {
                // No book specified, show book selection
                this.showBookSelection();
            }
        } else {
            errorDiv.textContent = 'Invalid username or password. Try: teacher / password123';
        }
    }

    logout() {
        sessionStorage.removeItem('readerAuth');
        this.isAuthenticated = false;
        window.location.reload();
    }

    async loadBookData() {
        try {
            // Get book parameter from URL
            const urlParams = new URLSearchParams(window.location.search);
            const bookParam = urlParams.get('book');
            
            // Define available books
            const books = {
                'one_little_byte': {
                    file: '../data/one_little_byte.json',
                    title: 'One Little Byte'
                },
                'spellbound_by_sparkles': {
                    file: '../data/spellbound_by_sparkles.json',
                    title: 'Spellbound by Sparkles'
                },
                'als_go_rhythm': {
                    file: '../data/als_go_rhythm.json',
                    title: "Al's Go Rhythm"
                }
            };
            
            // Default to One Little Byte if no book specified
            const selectedBook = books[bookParam] || books['one_little_byte'];
            
            const response = await fetch(selectedBook.file);
            this.bookData = await response.json();
            this.totalPages = this.bookData.pages.length + 2; // +1 for cover, +1 for "The End"
            
            // Check if this book has audio
            this.checkAudioSupport();
            
            // Update page slider
            const pageSlider = document.getElementById('page-slider');
            if (pageSlider) {
                pageSlider.max = this.totalPages - 1;
            }
            
            // Update book title in header
            const bookTitle = document.getElementById('book-title');
            if (bookTitle) {
                bookTitle.textContent = this.bookData.title;
            }
            
            // Update cover page content
            this.updateCoverDisplay();
        } catch (error) {
            console.error('Error loading book data:', error);
            // Show error message to user
            document.querySelector('.book-display').innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>Error Loading Book</h2>
                    <p>Could not load book data. Please check console for details.</p>
                    <p>Make sure you're running this from a web server, not opening the file directly.</p>
                </div>
            `;
        }
    }

    checkAudioSupport() {
        // Check if any page in the current book has audio
        this.hasAudio = this.bookData.pages.some(page => page.audio);
        
        // Show/hide audio controls based on audio support
        const audioControls = document.getElementById('audioControls');
        if (audioControls) {
            audioControls.style.display = this.hasAudio ? 'block' : 'none';
        }
        
        console.log(`Audio support for current book: ${this.hasAudio}`);
    }

    updateCoverDisplay() {
        // Use the cover URL from the book data instead of local images
        const coverImagePath = this.bookData.cover;
        
        // Update both cover images (selection mode and reading mode)
        const selectionModeImg = document.querySelector('#selection-mode img');
        const readingModeImg = document.querySelector('#reading-mode img');
        
        if (selectionModeImg && coverImagePath) {
            selectionModeImg.src = coverImagePath;
            selectionModeImg.alt = `${this.bookData.title} Cover`;
        }
        
        if (readingModeImg && coverImagePath) {
            readingModeImg.src = coverImagePath;
            readingModeImg.alt = `${this.bookData.title} Cover`;
        }
        
        // Update cover text content
        const titleElement = document.querySelector('#selection-mode h2');
        const subtitleElement = document.querySelector('#selection-mode p');
        
        if (titleElement) {
            titleElement.textContent = this.bookData.title;
        }
        
        if (subtitleElement && this.bookData.subtitle) {
            subtitleElement.textContent = this.bookData.subtitle;
        }
    }

    setupEventListeners() {
        // Remove any existing event listeners to avoid duplicates
        const startBtn = document.getElementById('start-reading');
        if (startBtn) {
            // Clone the button to remove all event listeners
            const newStartBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newStartBtn, startBtn);
            
            // Add the event listener to the new button
            newStartBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the general click handler
                // Start reading shows the actual book cover as first page
                this.isReading = true;
                this.showReadingMode();
                this.updateDisplay();
            });
        }
        
        // Remove existing listeners and add new ones for navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        // Clone buttons to remove all event listeners
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            newPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previousPage();
            });
        }
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            newNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.nextPage();
            });
        }
        
        // Book switcher button
        const bookSwitcherBtn = document.getElementById('book-switcher-btn');
        if (bookSwitcherBtn) {
            const newBookSwitcherBtn = bookSwitcherBtn.cloneNode(true);
            bookSwitcherBtn.parentNode.replaceChild(newBookSwitcherBtn, bookSwitcherBtn);
            newBookSwitcherBtn.addEventListener('click', () => {
                this.showBookSelection();
            });
        }
        
        // Page slider
        const pageSlider = document.getElementById('page-slider');
        if (pageSlider) {
            const newPageSlider = pageSlider.cloneNode(true);
            pageSlider.parentNode.replaceChild(newPageSlider, pageSlider);
            newPageSlider.addEventListener('input', (e) => {
                this.goToPage(parseInt(e.target.value));
            });
        }
        
        // Remove existing keyboard listeners and add new one
        document.removeEventListener('keydown', this.keydownHandler);
        this.keydownHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                this.previousPage();
            }
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                this.nextPage();
            }
            if (e.key === 'Home') {
                e.preventDefault();
                this.goToPage(0);
            }
            if (e.key === 'End') {
                e.preventDefault();
                this.goToPage(this.totalPages - 1);
            }
            if (e.key === 'Escape') {
                if (this.isFullscreen) {
                    this.exitFullscreen();
                }
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
        
        // Remove existing wheel listener and add new one
        document.removeEventListener('wheel', this.wheelHandler);
        this.wheelHandler = (e) => {
            // Only handle wheel events when we're in the book display area
            const bookDisplay = e.target.closest('.book-display');
            if (!bookDisplay) return;
            
            // Don't interfere with scrolling in text content areas
            const textContent = e.target.closest('.text-content');
            if (textContent && textContent.scrollHeight > textContent.clientHeight) {
                // Allow normal scrolling if the text content is scrollable
                return;
            }
            
            e.preventDefault(); // Prevent page scrolling
            
            console.log('Wheel event detected, deltaY:', e.deltaY); // Debug
            
            if (e.deltaY > 0) {
                // Scrolling down = next page (like right click)
                console.log('Wheel down - going to next page'); // Debug
                this.nextPage();
            } else if (e.deltaY < 0) {
                // Scrolling up = previous page (like left click)
                console.log('Wheel up - going to previous page'); // Debug
                this.previousPage();
            }
        };
        document.addEventListener('wheel', this.wheelHandler, { passive: false });
        
        // Fullscreen
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            const newFullscreenBtn = fullscreenBtn.cloneNode(true);
            fullscreenBtn.parentNode.replaceChild(newFullscreenBtn, fullscreenBtn);
            newFullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // Home button
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            const newHomeBtn = homeBtn.cloneNode(true);
            homeBtn.parentNode.replaceChild(newHomeBtn, homeBtn);
            newHomeBtn.addEventListener('click', () => {
                window.location.href = '../index.html';
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Remove existing click listener and add new one
        document.removeEventListener('click', this.clickHandler);
        this.clickHandler = (e) => {
            console.log('Document click detected on:', e.target); // Debug
            
            // Get the main book display area
            const bookDisplay = e.target.closest('.book-display');
            if (!bookDisplay) return;
            
            // Don't interfere with button clicks
            if (e.target.closest('button') || e.target.closest('.header-controls') || e.target.closest('.footer-controls')) {
                console.log('Click on button/controls, ignoring'); // Debug
                return;
            }
            
            console.log('Processing page click navigation'); // Debug
            
            // Special case: if we're on the reading mode cover (page 0 in reading mode), go to page 1
            if (this.currentPage === 0 && this.isReading) {
                console.log('Cover page click - going to next page'); // Debug
                this.nextPage();
                return;
            }
            
            // For other pages, use left/right navigation
            const rect = bookDisplay.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pageWidth = rect.width;
            
            // Right side = forward, left side = back
            if (clickX > pageWidth / 2) {
                console.log('Right side click - going forward'); // Debug
                this.nextPage();
            } else {
                console.log('Left side click - going back'); // Debug
                this.previousPage();
            }
        };
        document.addEventListener('click', this.clickHandler);
        
        // Audio toggle (only if book has audio support)
        if (this.hasAudio) {
            const audioToggle = document.getElementById('audioToggle');
            if (audioToggle) {
                const newAudioToggle = audioToggle.cloneNode(true);
                audioToggle.parentNode.replaceChild(newAudioToggle, audioToggle);
                newAudioToggle.addEventListener('click', () => {
                    this.toggleAudio();
                });
            }
        }
    }

    nextPage() {
        console.log('nextPage called - currentPage:', this.currentPage, 'totalPages:', this.totalPages, 'isNavigating:', this.isNavigating);
        
        // Prevent rapid navigation
        if (this.isNavigating) {
            console.log('Navigation blocked - already navigating');
            return;
        }
        
        if (this.currentPage < this.totalPages - 1) {
            this.isNavigating = true;
            this.currentPage++;
            console.log('Moving to page:', this.currentPage);
            this.updateDisplay();
            
            // Reset navigation lock after a short delay
            setTimeout(() => {
                this.isNavigating = false;
            }, 200);
        }
    }

    previousPage() {
        console.log('previousPage called - currentPage:', this.currentPage, 'isNavigating:', this.isNavigating);
        
        // Prevent rapid navigation
        if (this.isNavigating) {
            console.log('Navigation blocked - already navigating');
            return;
        }
        
        if (this.currentPage > 0) {
            this.isNavigating = true;
            this.currentPage--;
            console.log('Moving to page:', this.currentPage);
            this.updateDisplay();
            
            // Reset navigation lock after a short delay
            setTimeout(() => {
                this.isNavigating = false;
            }, 200);
        }
    }

    goToPage(pageNumber) {
        if (pageNumber >= 0 && pageNumber < this.totalPages) {
            this.currentPage = pageNumber;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        // Add exit animation to current active page
        const currentActive = document.querySelector('.book-page.active');
        if (currentActive) {
            currentActive.classList.add('page-exit');
            setTimeout(() => {
                currentActive.classList.remove('active', 'page-exit');
                this.showNewPage();
            }, 300); // Match the fadeOut animation duration
        } else {
            this.showNewPage();
        }
    }

    showNewPage() {
        // Clear previous dynamic pages
        document.querySelectorAll('.dynamic-page').forEach(page => {
            page.remove();
        });

        // Hide all pages first
        document.querySelectorAll('.book-page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        // Update page indicator
        const indicator = document.getElementById('page-indicator');
        const slider = document.getElementById('page-slider');
        const readerContainer = document.getElementById('readerContainer');
        
        // Calculate progress for fullscreen mode
        const progress = (this.currentPage / (this.totalPages - 1)) * 100;
        readerContainer.style.setProperty('--progress', progress);
        readerContainer.setAttribute('data-page-info', `Page ${this.currentPage} of ${this.totalPages - 1}`);
        
        if (this.currentPage === 0) {
            // Show cover
            const coverElement = document.getElementById('cover');
            coverElement.style.display = 'flex';
            coverElement.classList.add('active');
            if (this.isReading) {
                indicator.textContent = 'Book Cover';
                readerContainer.setAttribute('data-page-info', 'Book Cover');
            } else {
                indicator.textContent = 'Cover';
                readerContainer.setAttribute('data-page-info', 'Cover Page');
            }
        } else if (this.currentPage === this.totalPages - 1) {
            // Show "The End" page
            const endPageElement = document.getElementById('end-page');
            if (endPageElement) {
                endPageElement.style.display = 'flex';
                endPageElement.classList.add('active');
            }
            indicator.textContent = 'The End';
            readerContainer.setAttribute('data-page-info', 'The End');
        } else {
            // Show story page
            this.renderPage(this.currentPage);
            indicator.textContent = `Page ${this.currentPage} of ${this.totalPages - 2}`; // -2 because cover and end page
        }
        
        slider.value = this.currentPage;
        
        // Update button states
        document.getElementById('prev-btn').disabled = this.currentPage === 0;
        document.getElementById('next-btn').disabled = this.currentPage === this.totalPages - 1;
    }

    renderPage(pageIndex) {
        const pageData = this.bookData.pages[pageIndex - 1]; // -1 because cover is index 0
        
        if (!pageData) return;
        
        // Play audio for this page if audio is enabled
        this.playAudioForPage(pageIndex);
        
        // Determine page type - show image if it exists in the data
        const hasImage = pageData.image;
        
        if (hasImage) {
            // Story page with image
            this.renderStoryPage(pageData);
        } else {
            // Text-only page (discussion/educational)
            this.renderTextOnlyPage(pageData);
        }
    }

    renderStoryPage(pageData) {
        const storyPage = document.getElementById('page-template').cloneNode(true);
        storyPage.id = `page-${pageData.pageNumber}`;
        storyPage.classList.add('dynamic-page');
        storyPage.style.display = 'flex';
        
        // Add text
        const textContent = storyPage.querySelector('.text-content');
        textContent.innerHTML = this.formatText(pageData.text);
        
        // Add image
        const imageContent = storyPage.querySelector('.image-content');
        imageContent.innerHTML = `<img src="../${pageData.image}" alt="Page ${pageData.pageNumber} illustration">`;
        
        document.querySelector('.book-display').appendChild(storyPage);
        storyPage.classList.add('active');
    }

    renderTextOnlyPage(pageData) {
        const textPage = document.getElementById('text-page-template').cloneNode(true);
        textPage.id = `page-${pageData.pageNumber}`;
        textPage.classList.add('dynamic-page');
        textPage.style.display = 'flex';
        
        const textContent = textPage.querySelector('.text-content');
        textContent.innerHTML = this.formatText(pageData.text);
        
        document.querySelector('.book-display').appendChild(textPage);
        textPage.classList.add('active');
    }

    formatText(text) {
        // Enhanced text formatting
        let formatted = text
            // Convert newlines to paragraphs
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => {
                // Handle markdown-style formatting
                paragraph = paragraph
                    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                    .replace(/^(\d+\.\s)/gm, '<br>$1')
                    .replace(/\n/g, '<br>');
                
                return `<p>${paragraph}</p>`;
            })
            .join('');
        
        // Handle special cases for question lists
        if (text.includes('Questions that turn')) {
            formatted = formatted.replace(/(\d+\.\s[^<]+?)(<br>|$)/g, '<div class="question">$1</div>');
        }
        
        return formatted;
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    showReadingMode() {
        const selectionMode = document.getElementById('selection-mode');
        const readingMode = document.getElementById('reading-mode');
        
        if (selectionMode) {
            selectionMode.style.display = 'none';
        }
        if (readingMode) {
            readingMode.style.display = 'flex';
        }
    }

    handleFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement);
        
        const readerContainer = document.getElementById('readerContainer');
        const header = document.querySelector('.reader-header');
        const footer = document.querySelector('.reader-footer');
        
        if (this.isFullscreen) {
            readerContainer.classList.add('fullscreen-mode');
            header.style.display = 'none';
            footer.style.display = 'none';
            document.getElementById('fullscreen-btn').textContent = '↙ Exit Fullscreen';
        } else {
            readerContainer.classList.remove('fullscreen-mode');
            header.style.display = 'block';
            footer.style.display = 'block';
            document.getElementById('fullscreen-btn').textContent = '🔲 Fullscreen';
        }
    }
    
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const audioToggle = document.getElementById('audioToggle');
        
        if (this.audioEnabled) {
            audioToggle.textContent = '🔊 Audio: On';
            audioToggle.classList.add('active');
            
            // Play audio for current page if we're reading and not on cover/end
            if (this.isReading && this.currentPage > 0 && this.currentPage < this.totalPages - 1) {
                this.playAudioForPage(this.currentPage);
            }
        } else {
            audioToggle.textContent = '🔇 Audio: Off';
            audioToggle.classList.remove('active');
            this.audioElement.pause();
        }
        
        console.log(`Audio ${this.audioEnabled ? 'enabled' : 'disabled'}`);
    }

    playAudioForPage(pageIndex) {
        if (!this.audioEnabled || !this.hasAudio) return;
        
        // pageIndex 1 = first story page (page 0 is cover, page totalPages-1 is end)
        const storyPageIndex = pageIndex - 1;
        const pageData = this.bookData.pages[storyPageIndex];
        
        if (pageData && pageData.audio) {
            // Fix path - audio files are in the root directory, but reader is in /reader/ subdirectory
            const audioPath = `../${pageData.audio}`;
            console.log(`Playing audio: ${audioPath} for page ${pageIndex} (delayed 1 second)`);
            
            // Delay audio playback by 1 second to let page fade-in complete
            setTimeout(() => {
                this.audioElement.src = audioPath;
                this.audioElement.play().catch(error => {
                    console.error('Error playing audio:', error);
                });
            }, 1000); // 1 second delay
        }
    }
}

// Initialize the reader when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BookReader();
});

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('fullscreen-btn');
    if (btn) {
        btn.textContent = document.fullscreenElement ? '↙ Exit Fullscreen' : '🔲 Fullscreen';
    }
});
