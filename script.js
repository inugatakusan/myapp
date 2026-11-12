let events = [];
let currentTab = 'ALL';
let selectedPriority = 'HIGH'; 
let selectedCategory = 'CAT1';

// ドラッグ状態管理用
let dragState = {
    type: null,      // 'parent' または 'child'
    parentId: null,  // ドラッグ元の親ID
    childId: null    // ドラッグ元の子ID（子タスク移動時）
};

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
                if (ev.category === 'TASK') ev.category = 'CAT1';
                if (ev.category === 'MTG') ev.category = 'CAT2';
                if (!ev.category) ev.category = 'CAT1';
            });
        } else {
            events = [];
        }
        
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
const btnSort = document.getElementById('btn-sort');

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

// タブをダブルクリックして名前を変更
function attachTabRenameListeners() {
    const editableTabs = document.querySelectorAll('.tab-btn[data-tab^="CAT"]');
    editableTabs.forEach(tab => {
        tab.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            const tabKey = this.getAttribute('data-tab');
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

// 優先度順に整列（SORTボタン）
const priorityWeight = { 'HIGH': 1, 'MID': 2, 'LOW': 3 };
function sortEvents() {
    events.sort((a, b) => (priorityWeight[a.priority] || 4) - (priorityWeight[b.priority] || 4));
}

if (btnSort) {
    btnSort.addEventListener('click', () => {
        sortEvents();
        saveData();
        renderEvents();
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

// 追加処理（自由な並び替えを優先するため、追加時はリストの末尾に追加）
function addNewTask() {
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
    saveData();
    renderEvents();
    pixelInput.value = "";
}

if (addButton) {
    addButton.addEventListener('click', addNewTask);
}
if (pixelInput) {
    pixelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            addNewTask();
        }
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
    if (e.key === 'Enter' && !e.isComposing) {
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

// 描画処理
function renderEvents() {
    if (!taskList) return;
    taskList.innerHTML = "";

    const filteredEvents = events.filter(ev => currentTab === 'ALL' || ev.category === currentTab);

    filteredEvents.forEach(event => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${event.completed ? 'is-completed' : ''}`;
        taskCard.setAttribute('data-id', event.id);

        const pClass = (event.priority || 'HIGH').toLowerCase();
        const displayCategoryName = tabNames[event.category] || 'TASK';

        let subtaskAreaHtml = "";
        if (event.children.length > 0 || event.showInput) {
            subtaskAreaHtml = `<div class="subtask-container">`;
            event.children.forEach(child => {
                subtaskAreaHtml += `
                    <div class="subtask-item ${child.completed ? 'is-completed' : ''}" data-parent-id="${event.id}" data-child-id="${child.id}">
                        <span class="subtask-drag-handle" title="ドラッグして並び替え">⋮⋮</span>
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
                <span class="drag-handle" title="ドラッグして並び替え">⋮⋮</span>
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
    attachDragAndDropListeners();
}

// ドラッグ＆ドロップ機能のセットアップ
function attachDragAndDropListeners() {
    // 1. 親タスクカードのドラッグ＆ドロップ
    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        const handle = card.querySelector('.drag-handle');
        
        // つまみを押した時だけカード全体をドラッグ可能にする
        if (handle) {
            handle.addEventListener('mousedown', () => card.setAttribute('draggable', 'true'));
            handle.addEventListener('mouseup', () => card.removeAttribute('draggable'));
        }

        card.addEventListener('dragstart', (e) => {
            if (dragState.type === 'child') return; // 子タスクのドラッグ中は親を発火させない
            dragState.type = 'parent';
            dragState.parentId = Number(card.getAttribute('data-id'));
            card.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
            card.removeAttribute('draggable');
            cards.forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
            dragState = { type: null, parentId: null, childId: null };
        });

        card.addEventListener('dragover', (e) => {
            if (dragState.type !== 'parent') return;
            e.preventDefault();
            const targetId = Number(card.getAttribute('data-id'));
            if (targetId === dragState.parentId) return;

            const rect = card.getBoundingClientRect();
            const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);
            
            card.classList.remove('drag-over-top', 'drag-over-bottom');
            card.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        card.addEventListener('drop', (e) => {
            if (dragState.type !== 'parent') return;
            e.preventDefault();
            const targetId = Number(card.getAttribute('data-id'));
            if (targetId === dragState.parentId) return;

            const rect = card.getBoundingClientRect();
            const insertBefore = (e.clientY - rect.top) < (rect.height / 2);

            const fromIndex = events.findIndex(ev => ev.id === dragState.parentId);
            if (fromIndex === -1) return;
            const [movedItem] = events.splice(fromIndex, 1);

            let toIndex = events.findIndex(ev => ev.id === targetId);
            if (!insertBefore) toIndex += 1;

            events.splice(toIndex, 0, movedItem);
            saveData();
            renderEvents();
        });
    });

    // 2. 子タスクのドラッグ＆ドロップ（同じ親タスク内で並び替え）
    const subtaskItems = document.querySelectorAll('.subtask-item');
    subtaskItems.forEach(item => {
        const subHandle = item.querySelector('.subtask-drag-handle');
        if (subHandle) {
            subHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                item.setAttribute('draggable', 'true');
            });
            subHandle.addEventListener('mouseup', () => item.removeAttribute('draggable'));
        }

        item.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            dragState.type = 'child';
            dragState.parentId = Number(item.getAttribute('data-parent-id'));
            dragState.childId = Number(item.getAttribute('data-child-id'));
            item.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', (e) => {
            e.stopPropagation();
            item.classList.remove('is-dragging');
            item.removeAttribute('draggable');
            subtaskItems.forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
            dragState = { type: null, parentId: null, childId: null };
        });

        item.addEventListener('dragover', (e) => {
            if (dragState.type !== 'child') return;
            const targetParentId = Number(item.getAttribute('data-parent-id'));
            const targetChildId = Number(item.getAttribute('data-child-id'));
            if (targetParentId !== dragState.parentId || targetChildId === dragState.childId) return;

            e.preventDefault();
            e.stopPropagation();
            const rect = item.getBoundingClientRect();
            const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);

            item.classList.remove('drag-over-top', 'drag-over-bottom');
            item.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        item.addEventListener('drop', (e) => {
            if (dragState.type !== 'child') return;
            const targetParentId = Number(item.getAttribute('data-parent-id'));
            const targetChildId = Number(item.getAttribute('data-child-id'));
            if (targetParentId !== dragState.parentId || targetChildId === dragState.childId) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = item.getBoundingClientRect();
            const insertBefore = (e.clientY - rect.top) < (rect.height / 2);

            const parentEvent = events.find(ev => ev.id === dragState.parentId);
            if (!parentEvent) return;

            const fromIdx = parentEvent.children.findIndex(ch => ch.id === dragState.childId);
            if (fromIdx === -1) return;
            const [movedChild] = parentEvent.children.splice(fromIdx, 1);

            let toIdx = parentEvent.children.findIndex(ch => ch.id === targetChildId);
            if (!insertBefore) toIdx += 1;

            parentEvent.children.splice(toIdx, 0, movedChild);
            saveData();
            renderEvents();
        });
    });
}

// インライン文字編集
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
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) finishEdit(); if (e.key === 'Escape') this.textContent = originalText; });
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