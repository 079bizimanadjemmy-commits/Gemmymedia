// Admin Credentials
const ADMIN_USER = "admin";
const ADMIN_PASS = "gemmy2026";

let currentTab = 'movies';
let allData = { movies: [], games: [], streaming: [] };

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const itemForm = document.getElementById('item-form');

    document.addEventListener('DOMContentLoaded', () => {

    showDashboard(); // open dashboard automatically

});

    logoutBtn.onclick = () => {
        sessionStorage.removeItem('adminLoggedIn');
        location.reload();
    };

    itemForm.onsubmit = async (e) => {
        e.preventDefault();
        await saveItem();
    };
});


async function loadData() {
    try {
        const moviesRes = await fetch('/api/data/movies');
        const gamesRes = await fetch('/api/data/games');
        const streamingRes = await fetch('/api/data/streaming');
        allData.movies = await moviesRes.json();
        allData.games = await gamesRes.json();
        allData.streaming = await streamingRes.json();
        renderList();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('movies-tab').style.display = tab === 'movies' ? 'block' : 'none';
    document.getElementById('streaming-tab').style.display = tab === 'streaming' ? 'block' : 'none';
    document.getElementById('games-tab').style.display = tab === 'games' ? 'block' : 'none';
    renderList();
}

function renderList() {
    const list = document.getElementById(`${currentTab}-list`);
    const items = allData[currentTab];
    
    list.innerHTML = items.map(item => `
        <div class="admin-item">
            <div class="item-info">
                <h4>${item.title}</h4>
                <p>${item.vj || item.publisher || 'N/A'} | ${item.type || 'Item'}</p>
            </div>
            <div class="admin-actions">
                <button class="btn btn-outline" onclick="editItem(${item.id})">Edit</button>
                <button class="btn btn-outline" style="color: #ff4444;" onclick="deleteItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function openItemModal(type, item = null) {
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('modal-title');
    
    document.getElementById('item-id').value = item ? item.id : '';
    document.getElementById('item-type').value = type;
    document.getElementById('item-title').value = item ? item.title : '';
    document.getElementById('item-vj').value = item ? (item.vj || item.publisher || '') : '';
    document.getElementById('item-desc').value = item ? item.description : '';
    document.getElementById('item-poster').value = item ? (item.poster || item.cover) : '';
    document.getElementById('item-download').value = item ? (item.download || '') : '';
    
    if (type === 'movies' || type === 'streaming') {
        document.getElementById('movie-fields').style.display = 'block';
        document.getElementById('item-category').value = item ? item.category : 'agasobanuye';
    } else {
        document.getElementById('movie-fields').style.display = 'none';
    }

    title.textContent = item ? `Edit ${type}` : `Add New ${type}`;
    modal.style.display = 'flex';
}

function closeItemModal() {
    document.getElementById('item-modal').style.display = 'none';
}

function editItem(id) {
    const item = allData[currentTab].find(i => i.id === id);
    openItemModal(currentTab, item);
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    allData[currentTab] = allData[currentTab].filter(i => i.id !== id);
    await syncData();
}

async function saveItem() {
    const id = document.getElementById('item-id').value;
    const type = document.getElementById('item-type').value;
    
    const newItem = {
        id: id ? parseInt(id) : Date.now(),
        title: document.getElementById('item-title').value,
        description: document.getElementById('item-desc').value,
        download: document.getElementById('item-download').value,
    };

    const imgUrl = document.getElementById('item-poster').value;

    if (type === 'movies' || type === 'streaming') {
        newItem.poster = imgUrl;
        newItem.vj = document.getElementById('item-vj').value;
        newItem.category = document.getElementById('item-category').value;
        newItem.type = type === 'streaming' ? 'Streaming' : (newItem.category === 'Series' ? 'Series' : 'Movie');
        // For streaming, we might want to use the video field for the actual stream
        newItem.video = newItem.download; // Use download URL as the stream source if it's streaming
    } else {
        newItem.cover = imgUrl;
        newItem.publisher = document.getElementById('item-vj').value;
        newItem.type = 'Game';
    }

    if (id) {
        const index = allData[type].findIndex(i => i.id === parseInt(id));
        allData[type][index] = { ...allData[type][index], ...newItem };
    } else {
        allData[type].push(newItem);
    }

    await syncData(type);
    closeItemModal();
}

async function syncData(type = currentTab) {
    try {
        const response = await fetch(`/api/data/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData[type])
        });
        
        if (response.ok) {
            alert('Data saved successfully!');
            await loadData();
        } else {
            alert('Failed to save data.');
        }
    } catch (error) {
        console.error("Error syncing data:", error);
    }
}
