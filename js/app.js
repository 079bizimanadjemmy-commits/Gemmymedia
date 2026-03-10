// GemmyMedia Portal Logic

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadPortalData();
    setupSearch();
    setupSidebar();
    setupCategoryFilters();
    injectAuthModal();
    loadRatingStats();
});

window.currentUser = null;
let ratingStats = {};

async function loadRatingStats() {
    try {
        const response = await fetch('/api/reviews/stats/all');
        ratingStats = await response.json();
    } catch (error) {
        console.error('Failed to load rating stats:', error);
    }
}

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        window.currentUser = data.user;
        updateAuthUI();
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateAuthUI() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    if (window.currentUser) {
        navRight.innerHTML = `
            <button class="icon-btn" onclick="document.getElementById('main-search').focus()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
            <div class="user-profile-btn" onclick="showUserMenu()">
                <div class="user-avatar">${window.currentUser.username.charAt(0).toUpperCase()}</div>
                <div class="user-name">${window.currentUser.username}</div>
            </div>
        `;
    } else {
        navRight.innerHTML = `
            <button class="icon-btn" onclick="document.getElementById('main-search').focus()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
            <button class="btn btn-primary" onclick="showAuthModal()" style="padding: 0.4rem 1.2rem; font-size: 0.8rem;">Login</button>
        `;
    }
}

function showAuthModal(type = 'login') {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    switchAuthTab(type);
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function switchAuthTab(type) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (type === 'login') {
        tabs[0].classList.add('active');
        forms[0].classList.add('active');
    } else {
        tabs[1].classList.add('active');
        forms[1].classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            window.currentUser = data.user;
            updateAuthUI();
            closeAuthModal();
            location.reload(); // Refresh to update AI context
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Login failed');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const email = form.email.value;
    const password = form.password.value;

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (data.success) {
            window.currentUser = data.user;
            updateAuthUI();
            closeAuthModal();
            location.reload();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Signup failed');
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.currentUser = null;
    updateAuthUI();
    location.reload();
}

function showUserMenu() {
    if (confirm(`Logout from ${window.currentUser.username}?`)) {
        handleLogout();
    }
}

function injectAuthModal() {
    if (document.getElementById('auth-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-content">
            <div class="auth-header">
                <h2>GEMMY<span>MEDIA</span></h2>
            </div>
            <div class="auth-tabs">
                <div class="auth-tab active" onclick="switchAuthTab('login')">Login</div>
                <div class="auth-tab" onclick="switchAuthTab('signup')">Sign Up</div>
            </div>
            
            <form id="login-form" class="auth-form active" onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" class="auth-btn">LOGIN</button>
            </form>

            <form id="signup-form" class="auth-form" onsubmit="handleSignup(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" class="auth-btn">CREATE ACCOUNT</button>
            </form>
            
            <div style="text-align: center; margin-top: 1.5rem;">
                <button class="btn" onclick="closeAuthModal()" style="color: var(--text-secondary); background: none; border: none; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function setupCategoryFilters() {
    const catBtns = document.querySelectorAll('.cat-btn');
    catBtns.forEach(btn => {
        btn.onclick = () => {
            const cat = btn.getAttribute('data-category');
            catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (cat === 'all') {
                loadPortalData();
            } else {
                const filtered = window.all_content.filter(item => 
                    (item.category && item.category.toLowerCase() === cat.toLowerCase()) ||
                    (item.type && item.type.toLowerCase() === cat.toLowerCase())
                );
                
                const isGamesPage = window.location.pathname.includes('games.html');
                const isStreamingPage = window.location.pathname.includes('streaming.html');
                const isMoviesPage = window.location.pathname.includes('movies.html');

                if (isGamesPage) {
                    renderGrid(document.getElementById('games-grid'), filtered);
                } else if (isStreamingPage) {
                    renderGrid(document.getElementById('streaming-grid'), filtered);
                } else if (isMoviesPage) {
                    renderGrid(document.getElementById('movies-grid'), filtered);
                }
            }
        };
    });
}

function setupSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const close = document.getElementById('close-sidebar');
    const menu = document.getElementById('side-menu');

    if (toggle && menu) {
        toggle.onclick = () => menu.classList.add('open');
    }

    if (close && menu) {
        close.onclick = () => menu.classList.remove('open');
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.remove('open');
        }
    });

    // Setup scroll buttons
    const leftBtn = document.querySelector('.scroll-btn.left');
    const rightBtn = document.querySelector('.scroll-btn.right');
    const grid = document.getElementById('latest-grid');

    if (leftBtn && rightBtn && grid) {
        leftBtn.onclick = () => grid.scrollBy({ left: -400, behavior: 'smooth' });
        rightBtn.onclick = () => grid.scrollBy({ left: 400, behavior: 'smooth' });
    }
}

async function loadPortalData() {
    try {
        const isGamesPage = window.location.pathname.includes('games.html');
        const isStreamingPage = window.location.pathname.includes('streaming.html');
        const isMoviesPage = window.location.pathname.includes('movies.html');
        
        let dataPath = 'data/movies.json';
        if (isGamesPage) dataPath = 'data/games.json';
        if (isStreamingPage) dataPath = 'data/streaming.json';
        
        const response = await fetch(dataPath);
        const data = await response.json();
        window.all_content = data;
        
        if (isGamesPage) {
            renderGrid(document.getElementById('games-grid'), data);
        } else if (isStreamingPage) {
            renderGrid(document.getElementById('streaming-grid'), data);
        } else if (isMoviesPage) {
            renderGrid(document.getElementById('movies-grid'), data);
        } else {
            renderHero(data.filter(i => i.trending).slice(0, 5));
            renderPortal(data);
        }
    } catch (error) {
        console.error('Error loading portal data:', error);
    }
}

function renderHero(items) {
    const slider = document.getElementById('hero-slider');
    if (!slider || items.length === 0) return;

    slider.innerHTML = items.map((item, index) => `
        <div class="hero-slide ${index === 0 ? 'active' : ''}">
            <img src="${item.poster}" class="hero-bg" alt="${item.title}" referrerPolicy="no-referrer">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <span class="hero-type">${item.type || 'Movie'}</span>
                <h1 class="hero-title">${item.title}</h1>
                <div class="hero-meta">
                    <span class="badge">HD</span>
                    <span class="badge rating">★ 8.2</span>
                    <span class="badge">${item.category || 'Action'}</span>
                    <span class="badge">2026</span>
                </div>
                <p class="hero-desc">${item.description}</p>
                <button class="btn-watch" id="hero-watch-${item.id}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                    Watch Now
                </button>
            </div>
        </div>
    `).join('');

    items.forEach(item => {
        const btn = document.getElementById(`hero-watch-${item.id}`);
        if (btn) btn.onclick = () => openDetails(item);
    });

    // Hero slider logic
    let currentSlide = 0;
    const slides = document.querySelectorAll('.hero-slide');
    
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

function renderPortal(data) {
    const latestGrid = document.getElementById('latest-grid');
    const trendingGrid = document.getElementById('trending-grid');
    const seriesGrid = document.getElementById('series-grid');
    const moviesGrid = document.getElementById('movies-grid');
    const hindiGrid = document.getElementById('hindi-grid');
    const recentlyGrid = document.getElementById('recently-grid');

    if (latestGrid) renderGrid(latestGrid, data.slice(0, 12));
    if (trendingGrid) renderGrid(trendingGrid, data.filter(i => i.trending).slice(0, 6));
    if (seriesGrid) renderGrid(seriesGrid, data.filter(i => i.type === 'Series').slice(0, 6));
    if (moviesGrid) renderGrid(moviesGrid, data.filter(i => i.type === 'Movie').slice(0, 6));
    if (hindiGrid) renderGrid(hindiGrid, data.filter(i => i.category === 'India').slice(0, 6));
    if (recentlyGrid) renderGrid(recentlyGrid, [...data].reverse().slice(0, 6));
}

function renderGrid(container, items) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No content found.</p>';
        return;
    }

    items.forEach(item => {
        const stats = ratingStats[item.id];
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="card-thumb">
                <img src="${item.poster || item.cover}" alt="${item.title}" referrerPolicy="no-referrer">
                <div class="card-label">${item.type || 'Movie'}</div>
                ${item.episodes ? `<div class="card-ep">EP ${item.episodes}</div>` : ''}
                ${stats ? `<div class="rating-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${stats.avg}</div>` : ''}
            </div>
            <div class="card-info">
                <div class="card-title">${item.title}</div>
                <div class="card-vj">${item.vj || item.publisher || 'Narrated'}</div>
            </div>
        `;
        card.onclick = () => openDetails(item);
        container.appendChild(card);
    });
}

function setupSearch() {
    const searchInput = document.getElementById('main-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = window.all_content.filter(item => 
            item.title.toLowerCase().includes(term) || 
            (item.vj && item.vj.toLowerCase().includes(term)) ||
            (item.publisher && item.publisher.toLowerCase().includes(term)) ||
            (item.category && item.category.toLowerCase().includes(term))
        );
        
        const isStreamingPage = window.location.pathname.includes('streaming.html');
        const isGamesPage = window.location.pathname.includes('games.html');
        const hero = document.getElementById('hero-slider');
        
        if (term) {
            if (isStreamingPage) {
                document.querySelector('.section-title').textContent = `Search Results for "${term}"`;
                renderGrid(document.getElementById('streaming-grid'), filtered);
            } else if (isGamesPage) {
                document.querySelector('.section-title').textContent = `Search Results for "${term}"`;
                renderGrid(document.getElementById('games-grid'), filtered);
            } else {
                if (hero) hero.style.display = 'none';
                document.querySelectorAll('.main-content section').forEach(s => s.style.display = 'none');
                const latestSection = document.getElementById('latest-releases');
                latestSection.style.display = 'block';
                latestSection.querySelector('h2').textContent = `Search Results for "${term}"`;
                renderGrid(document.getElementById('latest-grid'), filtered);
            }
        } else {
            if (isStreamingPage) {
                document.querySelector('.section-title').textContent = `Streaming Films`;
                renderGrid(document.getElementById('streaming-grid'), window.all_content);
            } else if (isGamesPage) {
                document.querySelector('.section-title').textContent = `Game Store`;
                renderGrid(document.getElementById('games-grid'), window.all_content);
            } else {
                if (hero) hero.style.display = 'block';
                document.querySelectorAll('.main-content section').forEach(s => s.style.display = 'block');
                const latestSection = document.getElementById('latest-releases');
                latestSection.querySelector('h2').textContent = 'Latest Releases';
                
                const scrollBtns = latestSection.querySelector('.scroll-btns');
                if (scrollBtns) scrollBtns.style.display = 'flex';
                
                const grid = document.getElementById('latest-grid');
                if (grid) grid.classList.add('horizontal-scroll');
                
                renderPortal(window.all_content);
            }
        }
    });
}

function filterByLabel(label) {
    const filtered = window.all_content.filter(item => 
        (item.category && item.category.toLowerCase() === label.toLowerCase()) ||
        (item.labels && item.labels.includes(label))
    );
    updateView(`Category: ${label}`, filtered);
}

function filterByVJ(vj) {
    const filtered = window.all_content.filter(item => item.vj === vj);
    updateView(`Narrated by ${vj}`, filtered);
}

function filterByType(type) {
    const filtered = window.all_content.filter(item => item.type === type);
    updateView(`${type}s`, filtered);
}

function updateView(title, data) {
    // Hide all sections
    document.querySelectorAll('.main-content section').forEach(s => s.style.display = 'none');
    
    // Show and update latest releases section as the results container
    const latestSection = document.getElementById('latest-releases');
    latestSection.style.display = 'block';
    latestSection.querySelector('h2').textContent = title;
    
    // Hide scroll buttons in filtered view
    const scrollBtns = latestSection.querySelector('.scroll-btns');
    if (scrollBtns) scrollBtns.style.display = 'none';
    
    const grid = document.getElementById('latest-grid');
    grid.classList.remove('horizontal-scroll');
    renderGrid(grid, data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function openDetails(item) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-body');
    modal.style.display = 'flex';

    content.innerHTML = `
        <div style="position: sticky; top: 0; background: #000; padding: 1rem; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
            <h2 style="margin: 0; font-size: 1.1rem;">${item.title}</h2>
            <div onclick="closeModal()" style="cursor: pointer; font-size: 1.5rem;">&times;</div>
        </div>
        
        <div style="padding: 1.5rem;">
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
                <img src="${item.poster || item.cover}" style="width: 200px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="flex: 1; min-width: 300px;">
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                        <span style="background: var(--accent); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800;">${item.type}</span>
                        <span style="background: #222; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800; color: var(--accent-yellow);">${item.vj || item.publisher || ''}</span>
                    </div>
                    <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${item.description}</p>
                    <div style="background: rgba(255, 204, 0, 0.1); color: var(--accent-yellow); padding: 0.5rem 1rem; border-radius: 4px; display: inline-block; font-weight: 800; margin-top: 1rem;">FREE CONTENT</div>
                    
                    <div id="action-area" style="margin-top: 2rem;">
                        ${item.type === 'Streaming' ? `
                        <button class="btn-watch" onclick="document.getElementById('stream-player').scrollIntoView({behavior: 'smooth'})" style="width: 100%; justify-content: center; padding: 1rem;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                            STREAM NOW
                        </button>
                        ` : `
                        <a href="${item.download}" class="btn-download" target="_blank">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4m4-10 5 5 5-5m-5-7v12"/></svg>
                            DOWNLOAD NOW
                        </a>
                        `}
                    </div>
                </div>
            </div>

            ${item.video ? `
            <div id="stream-player" style="background: #111; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                <h3 style="font-size: 1rem; margin-bottom: 1rem; border-left: 4px solid var(--accent); padding-left: 0.75rem;">
                    ${item.type === 'Streaming' ? 'Full Film Stream' : 'Watch Preview'}
                </h3>
                <video controls poster="${item.poster || item.cover}" style="width: 100%; border-radius: 8px; background: #000;">
                    <source src="${item.video}" type="video/mp4">
                </video>
            </div>
            ` : ''}

            <div class="reviews-section">
                <h3 style="font-size: 1.2rem; margin-bottom: 1.5rem;">User Reviews</h3>
                
                <div id="review-form-container">
                    ${currentUser ? `
                        <div class="review-form">
                            <h4 style="margin-bottom: 1rem; font-size: 0.9rem;">Leave a Review</h4>
                            <div class="star-rating" id="star-rating">
                                ${[1, 2, 3, 4, 5].map(i => `
                                    <svg onclick="setRating(${i})" data-value="${i}" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                `).join('')}
                            </div>
                            <textarea id="review-comment" placeholder="Write your thoughts..." style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; min-height: 100px; font-family: inherit;"></textarea>
                            <button class="btn btn-primary" onclick="submitReview('${item.id}')" style="width: 100%; padding: 0.8rem;">Submit Review</button>
                        </div>
                    ` : `
                        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 2rem;">
                            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Please login to leave a review.</p>
                            <button class="btn btn-primary" onclick="showAuthModal()">Login Now</button>
                        </div>
                    `}
                </div>

                <div id="review-list" class="review-list">
                    <p style="text-align: center; padding: 2rem;">Loading reviews...</p>
                </div>
            </div>
        </div>
    `;

    loadReviews(item.id);
}

let selectedRating = 0;

function setRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('#star-rating svg');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitReview(contentId) {
    if (selectedRating === 0) {
        alert('Please select a rating');
        return;
    }

    const comment = document.getElementById('review-comment').value.trim();
    if (!comment) {
        alert('Please write a comment');
        return;
    }

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentId, rating: selectedRating, comment })
        });
        const data = await response.json();
        if (data.success) {
            alert('Review submitted successfully!');
            selectedRating = 0;
            loadReviews(contentId);
            loadRatingStats(); // Refresh stats for the badge
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Failed to submit review');
    }
}

async function loadReviews(contentId) {
    const list = document.getElementById('review-list');
    try {
        const response = await fetch(`/api/reviews/${contentId}`);
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            list.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review!</div>';
            return;
        }

        list.innerHTML = reviews.reverse().map(r => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-user">${r.username}</span>
                    <span class="review-date">${new Date(r.date).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">
                    ${Array(r.rating).fill('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>').join('')}
                </div>
                <div class="review-comment">${r.comment}</div>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = '<p style="text-align: center; color: #ff4444;">Failed to load reviews.</p>';
    }
}

function closeModal() {
    document.getElementById('details-modal').style.display = 'none';
}

// Global styles for buttons in modal
const style = document.createElement('style');
style.textContent = `
    .btn-unlock { background: var(--accent); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 800; width: 100%; cursor: pointer; }
    .btn-download { background: #22c55e; color: white; text-decoration: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .pay-btn { background: #222; color: white; border: 1px solid #333; padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem; cursor: pointer; font-weight: 600; }
    .pay-btn:hover { background: #333; }
`;
document.head.appendChild(style);
