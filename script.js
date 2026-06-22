let events = [];
let currentTab = 'ALL';
let selectedPriority = 'HIGH'; 
let selectedCategory = 'CAT1';

// 5つのカスタムタブ名オブジェクト
let tabNames = {
    CAT1: 'TASK',
    CAT2: 'MTG',
    CAT3: 'CAT3',
    CAT4: 'CAT4',
    CAT5: 'CAT5'
};

function loadData() {
    try {
        const savedData = localStorage.getItem('pixel_events');
        if (savedData) {
            events = JSON.parse(savedData);
            if (!Array.isArray(events)) events = [];
            events.forEach(ev => {
                if (!ev.children) ev.children = [];
                if (ev.showInput === undefined) ev.showInput = false;
                // 古いデータ形式（TASK/MTG）を新しいキー（CAT1/CAT2）へ自動コンバート
                if (ev.category === 'TASK') ev.category = 'CAT1';
                if (ev.category === 'MTG') ev.category = 'CAT2';
                if (!ev.category) ev.category = 'CAT1';
            });
        } else {
            events = [];
        }
        
        // 保存されたカスタムタブ名のロード
        const savedTabs = localStorage.getItem('pixel_tab_names');
        if (savedTabs) {
            tabNames = JSON.parse(savedTabs);
        }
    } catch (e) {
        events = [];
    }
}

const taskList = document.querySelector('.task-list');
const pixelInput = document.querySelector('.pixel-input');
const addButton = document.querySelector('.add-button');
const btnClean = document.getElementById('btn-clean');

const clockDiv = document.querySelector('.pixel-clock');
const dateDiv = document.querySelector('.pixel-date');

const favePlaceholder = document.getElementById('fave-placeholder');
const faveImg = document.getElementById('fave-img');
const faveInput = document.getElementById('fave-input');
const btnChangeFave = document.getElementById('btn-change-fave');

// 各テキストラベルの同期
function syncTabLabels() {
    for (let i = 1; i <= 5; i++) {
        const textEl = document.getElementById(`text-tab-cat${i}`);
        const btnEl = document.getElementById(`btn-cat-cat${i}`);
        if (textEl) textEl.textContent = tabNames[`CAT${i}`];
        if (btnEl) btnEl.textContent = tabNames[`CAT${i}`];
    }
}

// フィルタータブ切り替え
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        renderEvents();
    });
});

// タブをダブルクリックしてその場で名前を変更できるロジック
function attachTabRenameListeners() {
    const editableTabs = document.querySelectorAll('.tab-btn[data-tab^="CAT"]');
    editableTabs.forEach(tab => {
        tab.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            const tabKey = this.getAttribute('data-tab'); // 'CAT1' 〜 'CAT5'
            const textSpan = this.querySelector('.tab-text');
            if (this.querySelector('input')) return;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = tabNames[tabKey];
            input.className = 'tab-edit-input';
            
            textSpan.style.display = 'none';
            this.appendChild(input);
            input.focus();
            input.select();
            
            const saveTabName = () => {
                const newName = input.value.trim();
                if (newName !== '') {
                    tabNames[tabKey] = newName;
                    localStorage.setItem('pixel_tab_names', JSON.stringify(tabNames));
                }
                input.remove();
                textSpan.style.display = 'inline';
                syncTabLabels();
                renderEvents();
            };
            
            input.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') saveTabName();
                if (evt.key === 'Escape') {
                    input.remove();
                    textSpan.style.display = 'inline';
                }
            });
            input.addEventListener('blur', saveTabName);
        });
    });
}

// 優先度ボタン選択
const priorityButtons = document.querySelectorAll('.priority-btn');
priorityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        priorityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.getAttribute('data-priority');
    });
});

// カテゴリボタン選択
const catButtons = document.querySelectorAll('.cat-btn');
catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCategory = btn.getAttribute('data-cat');
    });
});

// 推し画像
function loadFaveImage() {
    const savedImg = localStorage.getItem('pixel_fave_image');
    if (savedImg) {
        if (faveImg) faveImg.src = savedImg;
        if (faveImg) faveImg.classList.remove('hidden');
        if (btnChangeFave) btnChangeFave.classList.remove('hidden');
        if (favePlaceholder) favePlaceholder.classList.add('hidden');
    }
}
if (favePlaceholder) favePlaceholder.addEventListener('click', () => faveInput && faveInput.click());
if (btnChangeFave) btnChangeFave.addEventListener('click', (e) => { e.stopPropagation(); faveInput && faveInput.click(); });
if (faveInput) {
    faveInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                localStorage.setItem('pixel_fave_image', event.target.result);
                if (faveImg) faveImg.src = event.target.result;
                if (faveImg) faveImg.classList.remove('hidden');
                if (btnChangeFave) btnChangeFave.classList.remove('hidden');
                if (favePlaceholder) favePlaceholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

// クリーンアップ
if (btnClean) {
    btnClean.addEventListener('click', () => {
        const hasCompleted = events.some(ev => ev.completed || ev.children.some(ch => ch.completed));
        if (!hasCompleted) { alert("完了済みのタスクはありません"); return; }
        if (confirm("完了済みのタスク・子タスクを削除しますか？")) {
            events.forEach(ev => ev.children = ev.children.filter(ch => !ch.completed));
            events = events.filter(ev => !ev.completed);
            saveData();
            renderEvents();
        }
    });
}

// 今日の日付自動連動
function updateDisplayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (clockDiv) clockDiv.textContent = `${year}/${month}/${date}`;
    if (dateDiv) dateDiv.textContent = `${days[today.getDay()]} / ${months[today.getMonth()]}`;
}

const priorityWeight = { 'HIGH': 1, 'MID': 2, 'LOW': 3 };
function sortEvents() {
    events.sort((a, b) => (priorityWeight[a.priority] || 4) - (priorityWeight[b.priority] || 4));
}

// 追加処理
if (addButton) {
    addButton.addEventListener('click', () => {
        if (!pixelInput) return;
        const title = pixelInput.value.trim();
        if (title === "") { alert("タスクを入力してください"); return; }

        events.push({
            id: Date.now(),
            title: title,
            type: 'TASK',
            priority: selectedPriority,
            category: selectedCategory,
            completed: false,
            showInput: false,
            children: []
        });
        sortEvents();
        saveData();
        renderEvents();
        pixelInput.value = "";
    });
}

function toggleSubtaskInput(parentId) {
    events = events.map(ev => ev.id === parentId ? { ...ev, showInput: !ev.showInput } : ev);
    saveData();
    renderEvents();
    const targetInput = document.querySelector(`input[data-parent-id="${parentId}"]`);
    if (targetInput) targetInput.focus();
}

function handleSubtaskKeydown(e, parentId) {
    if (e.key === 'Enter') {
        const title = e.target.value.trim();
        if (title === "") return;
        events = events.map(ev => {
            if (ev.id === parentId) {
                ev.children.push({ id: Date.now() + Math.random(), title: title, completed: false });
            }
            return ev;
        });
        saveData();
        renderEvents();
        const nextInput = document.querySelector(`input[data-parent-id="${parentId}"]`);
        if (nextInput) nextInput.focus();
    }
}

function updateParentTitle(id, newTitle) {
    if (newTitle.trim() === "") return;
    events = events.map(ev => ev.id === id ? { ...ev, title: newTitle } : ev);
    saveData();
    renderEvents();
}

function updateChildTitle(parentId, childId, newTitle) {
    if (newTitle.trim() === "") return;
    events = events.map(ev => {
        if (ev.id === parentId) {
            ev.children = ev.children.map(ch => ch.id === childId ? { ...ch, title: newTitle } : ch);
        }
        return ev;
    });
    saveData();
    renderEvents();
}

function toggleParentStatus(id) {
    events = events.map(ev => {
        if (ev.id === id) {
            const nextStatus = !ev.completed;
            return { ...ev, completed: nextStatus, children: ev.children.map(ch => ({ ...ch, completed: nextStatus })) };
        }
        return ev;
    });
    saveData();
    renderEvents();
}

function toggleChildStatus(parentId, childId) {
    events = events.map(ev => {
        if (ev.id === parentId) {
            ev.children = ev.children.map(ch => ch.id === childId ? { ...ch, completed: !ch.completed } : ch);
            ev.completed = ev.children.length > 0 && ev.children.every(ch => ch.completed);
        }
        return ev;
    });
    saveData();
    renderEvents();
}

function saveData() { localStorage.setItem('pixel_events', JSON.stringify(events)); }

function renderEvents() {
    if (!taskList) return;
    taskList.innerHTML = "";

    const filteredEvents = events.filter(ev => currentTab === 'ALL' || ev.category === currentTab);

    filteredEvents.forEach(event => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${event.completed ? 'is-completed' : ''}`;
        const pClass = (event.priority || 'HIGH').toLowerCase();
        const displayCategoryName = tabNames[event.category] || 'TASK';

        let subtaskAreaHtml = "";
        if (event.children.length > 0 || event.showInput) {
            subtaskAreaHtml = `<div class="subtask-container">`;
            event.children.forEach(child => {
                subtaskAreaHtml += `
                    <div class="subtask-item ${child.completed ? 'is-completed' : ''}">
                        <div class="subtask-check" style="background-color: ${child.completed ? '#94a3b8' : 'transparent'}" onclick="toggleChildStatus(${event.id}, ${child.id})"></div>
                        <span class="subtask-title" title="Double click to edit" data-type="child" data-parent="${event.id}" data-id="${child.id}">${child.title}</span>
                    </div>`;
            });
            if (event.showInput) {
                subtaskAreaHtml += `
                    <div class="subtask-input-row">
                        <div class="subtask-input-icon">↳</div>
                        <input type="text" class="subtask-inline-input" placeholder="Add subtask..." data-parent-id="${event.id}" onkeydown="handleSubtaskKeydown(event, ${event.id})">
                    </div>`;
            }
            subtaskAreaHtml += `</div>`;
        }

        taskCard.innerHTML = `
            <div class="task-main-row">
                <div class="task-check" style="background-color: ${event.completed ? '#94a3b8' : 'transparent'}" onclick="toggleParentStatus(${event.id})"></div>
                <div class="task-info">
                    <div class="task-title" title="Double click to edit" data-type="parent" data-id="${event.id}">${event.title}</div>
                    <div class="task-tags">
                        <span class="priority-dot-badge ${pClass}" title="${event.priority}"></span>
                        <span class="category-badge">${displayCategoryName}</span>
                    </div>
                </div>
                <button type="button" class="add-subtask-btn ${event.showInput ? 'is-active' : ''}" onclick="toggleSubtaskInput(${event.id})">＋</button>
            </div>
            ${subtaskAreaHtml}
        `;
        taskList.appendChild(taskCard);
    });
    attachEditListeners();
}

function attachEditListeners() {
    document.querySelectorAll('.task-title, .subtask-title').forEach(element => {
        element.addEventListener('dblclick', function() {
            if (this.querySelector('input')) return;
            const originalText = this.textContent;
            const type = this.getAttribute('data-type');
            const id = Number(this.getAttribute('data-id'));
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalText;
            input.className = 'edit-inline-input';
            
            this.innerHTML = '';
            this.appendChild(input);
            input.focus();

            const finishEdit = () => {
                const val = input.value.trim();
                if (val === '') { this.textContent = originalText; } 
                else {
                    if (type === 'parent') updateParentTitle(id, val);
                    else if (type === 'child') updateChildTitle(Number(this.getAttribute('data-parent')), id, val);
                }
            };
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') this.textContent = originalText; });
            input.addEventListener('blur', finishEdit);
        });
    });
}

loadData();
syncTabLabels();
attachTabRenameListeners();
updateDisplayDate();
loadFaveImage();
renderEvents();