let events = [];

function loadData() {
    try {
        const savedData = localStorage.getItem('pixel_events');
        if (savedData) {
            events = JSON.parse(savedData);
            if (!Array.isArray(events)) events = [];
            events.forEach(ev => {
                if (!ev.children) ev.children = [];
                if (ev.showInput === undefined) ev.showInput = false; // 開閉状態の初期化安全処理
            });
        } else {
            events = [];
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

let selectedPriority = 'HIGH'; 

// 優先度ボタン切り替え
const priorityButtons = document.querySelectorAll('.priority-btn');
priorityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        priorityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.getAttribute('data-priority');
    });
});

// 完了済み一括削除（CLEAN）
btnClean.addEventListener('click', () => {
    const hasCompleted = events.some(ev => ev.completed || ev.children.some(ch => ch.completed));
    if (!hasCompleted) {
        alert("完了済みのタスクはありません");
        return;
    }
    
    if (confirm("完了済みのタスク・子タスクを削除しますか？")) {
        events.forEach(ev => {
            ev.children = ev.children.filter(ch => !ch.completed);
        });
        events = events.filter(ev => !ev.completed);
        
        saveData();
        renderEvents();
    }
});

// 日付表示
function updateDisplayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = days[today.getDay()];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[today.getMonth()];

    if(clockDiv) clockDiv.textContent = `${year}/${month}/${date}`;
    if(dateDiv) dateDiv.textContent = `${dayOfWeek} / ${monthName}`;
}

const priorityWeight = { 'HIGH': 1, 'MID': 2, 'LOW': 3 };

function sortEvents() {
    events.sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 4;
        const weightB = priorityWeight[b.priority] || 4;
        return weightA - weightB;
    });
}

// 【親タスク】追加
addButton.addEventListener('click', () => {
    const title = pixelInput.value.trim();
    if (title === "") {
        alert("タスクを入力してください");
        return;
    }

    let newEvent = {
        id: Date.now(),
        title: title,
        type: 'TASK',
        priority: selectedPriority,
        completed: false,
        showInput: false, // 初期状態は入力欄を隠す
        children: []
    };

    events.push(newEvent);
    sortEvents();
    saveData();
    renderEvents();
    pixelInput.value = "";
});

// 【新機能】右上の「＋」ボタンで入力欄の表示/非表示を切り替える関数
function toggleSubtaskInput(parentId) {
    events = events.map(ev => {
        if (ev.id === parentId) {
            const nextState = !ev.showInput;
            return { ...ev, showInput: nextState };
        }
        return ev;
    });
    saveData();
    renderEvents();

    // 入力欄を開いた場合、即座にそこにフォーカスを当てる
    const targetInput = document.querySelector(`input[data-parent-id="${parentId}"]`);
    if (targetInput) targetInput.focus();
}

// インライン子タスク追加（Enterキー連動）
function handleSubtaskKeydown(e, parentId) {
    if (e.key === 'Enter') {
        const title = e.target.value.trim();
        if (title === "") return;

        events = events.map(ev => {
            if (ev.id === parentId) {
                ev.children.push({
                    id: Date.now() + Math.random(),
                    title: title,
                    completed: false
                });
            }
            return ev;
        });

        saveData();
        renderEvents();

        // 連続で打ち込めるように、開いた状態の入力欄に再度フォーカス
        const nextInput = document.querySelector(`input[data-parent-id="${parentId}"]`);
        if (nextInput) nextInput.focus();
    }
}

// 親タスクの完了切り替え
function toggleParentStatus(id) {
    events = events.map(ev => {
        if (ev.id === id) {
            const nextStatus = !ev.completed;
            const updatedChildren = ev.children.map(ch => ({ ...ch, completed: nextStatus }));
            return { ...ev, completed: nextStatus, children: updatedChildren };
        }
        return ev;
    });
    saveData();
    renderEvents();
}

// 子タスク単体の完了切り替え
function toggleChildStatus(parentId, childId) {
    events = events.map(ev => {
        if (ev.id === parentId) {
            ev.children = ev.children.map(ch => {
                if (ch.id === childId) {
                    return { ...ch, completed: !ch.completed };
                }
                return ch;
            });
            
            const allChildrenDone = ev.children.length > 0 && ev.children.every(ch => ch.completed);
            if (allChildrenDone) {
                ev.completed = true;
            } else if (ev.children.some(ch => !ch.completed)) {
                ev.completed = false;
            }
        }
        return ev;
    });
    saveData();
    renderEvents();
}

function saveData() {
    localStorage.setItem('pixel_events', JSON.stringify(events));
}

// 画面描画
function renderEvents() {
    if (!taskList) return;
    taskList.innerHTML = "";

    events.forEach(event => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${event.completed ? 'is-completed' : ''}`;

        const pClass = (event.priority || 'HIGH').toLowerCase();
        
        // 子タスク表示エリアの作成
        let subtaskAreaHtml = "";
        
        // 子タスクが1つでもある、または「入力欄を表示するモード」の時だけ枠を作る
        if ((event.children && event.children.length > 0) || event.showInput) {
            subtaskAreaHtml = `<div class="subtask-container">`;
            
            // 子タスク一覧のレンダリング
            if (event.children && event.children.length > 0) {
                event.children.forEach(child => {
                    subtaskAreaHtml += `
                        <div class="subtask-item ${child.completed ? 'is-completed' : ''}">
                            <div class="subtask-check" style="background-color: ${child.completed ? '#94a3b8' : 'transparent'}" onclick="toggleChildStatus(${event.id}, ${child.id})"></div>
                            <span class="subtask-title">${child.title}</span>
                        </div>
                    `;
                });
            }
            
            // 右上の＋が押されている時（showInput === true）だけ入力行をドッキング
            if (event.showInput) {
                subtaskAreaHtml += `
                    <div class="subtask-input-row">
                        <div class="subtask-input-icon">↳</div>
                        <input type="text" class="subtask-inline-input" 
                               placeholder="Add subtask..." 
                               data-parent-id="${event.id}"
                               onkeydown="handleSubtaskKeydown(event, ${event.id})">
                    </div>
                `;
            }
            
            subtaskAreaHtml += `</div>`;
        }

        taskCard.innerHTML = `
            <div class="task-main-row">
                <div class="task-check" style="background-color: ${event.completed ? '#94a3b8' : 'transparent'}" onclick="toggleParentStatus(${event.id})"></div>
                <div class="task-info">
                    <div class="task-title">${event.title}</div>
                    <div class="task-tags">
                        <span class="priority-badge ${pClass}">${event.priority}</span>
                    </div>
                </div>
                <button type="button" class="add-subtask-btn ${event.showInput ? 'is-active' : ''}" onclick="toggleSubtaskInput(${event.id})" title="Toggle subtask input">＋</button>
            </div>
            ${subtaskAreaHtml}
        `;
        taskList.appendChild(taskCard);
    });
}

loadData();
updateDisplayDate();
renderEvents();