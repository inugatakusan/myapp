let events = [];

// データの安全な読み込み
function loadData() {
    try {
        const savedData = localStorage.getItem('pixel_events');
        if (savedData) {
            events = JSON.parse(savedData);
            // 念のため読み込んだデータが配列であることを確認
            if (!Array.isArray(events)) {
                events = [];
            }
        } else {
            events = [];
        }
    } catch (e) {
        console.error("データ読み込みエラーのためリセットします", e);
        events = [];
    }
}

// 各種画面パーツの取得
const taskList = document.querySelector('.task-list');
const scheduleSection = document.querySelector('.schedule-section');
const pixelInput = document.querySelector('.pixel-input');
const addButton = document.querySelector('.add-button');
const btnClean = document.getElementById('btn-clean');

const btnTask = document.getElementById('btn-task');
const btnMtg = document.getElementById('btn-mtg');
const timeInput = document.getElementById('event-time');
const mtgColorWrapper = document.getElementById('mtg-color-wrapper');
const taskPriorityWrapper = document.getElementById('task-priority-wrapper');
const colorPicker = document.getElementById('event-color');

const clockDiv = document.querySelector('.pixel-clock');
const dateDiv = document.querySelector('.pixel-date');

let currentMode = 'TASK'; 
let selectedPriority = 'HIGH'; 
let currentFilter = 'ALL'; 

// 入力モード：TASK
btnTask.addEventListener('click', () => {
    currentMode = 'TASK';
    btnTask.classList.add('active');
    btnMtg.classList.remove('active');
    taskPriorityWrapper.classList.remove('hidden');
    timeInput.classList.add('hidden');
    mtgColorWrapper.classList.add('hidden');
});

// 入力モード：MTG
btnMtg.addEventListener('click', () => {
    currentMode = 'MTG';
    btnMtg.classList.add('active');
    btnTask.classList.remove('active');
    taskPriorityWrapper.classList.add('hidden');
    timeInput.classList.remove('hidden');
    mtgColorWrapper.classList.remove('hidden');
});

// 優先度ボタンの選択変更
const priorityButtons = document.querySelectorAll('.priority-btn');
priorityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        priorityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.getAttribute('data-priority');
    });
});

// 表示切り替えフィルタータブ
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        renderEvents(); 
    });
});

// 完了済み一括削除（CLEAN）
btnClean.addEventListener('click', () => {
    const hasCompleted = events.some(event => event.completed);
    if (!hasCompleted) {
        alert("完了済みのタスクはありません");
        return;
    }
    
    if (confirm("完了済みのタスクをすべて削除しますか？")) {
        events = events.filter(event => !event.completed);
        saveData();
        renderEvents();
    }
});

// 今日の日付を自動表示する関数
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

// データ並び替え
function sortEvents() {
    events.sort((a, b) => {
        if (a.type === 'MTG' && b.type === 'MTG') {
            const timeA = a.time || "--:--";
            const timeB = b.time || "--:--";
            return timeA.localeCompare(timeB);
        }
        if (a.type === 'TASK' && b.type === 'TASK') {
            const weightA = priorityWeight[a.priority] || 4;
            const weightB = priorityWeight[b.priority] || 4;
            return weightA - weightB;
        }
        return 0;
    });
}

// 「＋」追加ボタン処理
addButton.addEventListener('click', () => {
    const title = pixelInput.value.trim();

    if (title === "") {
        alert("内容を入力してください");
        return;
    }

    let newEvent = {
        id: Date.now(),
        title: title,
        type: currentMode,
        completed: false
    };

    if (currentMode === 'MTG') {
        newEvent.time = timeInput.value || "--:--";
        newEvent.color = colorPicker.value;
    } else {
        newEvent.priority = selectedPriority; 
    }

    events.push(newEvent);
    sortEvents();
    saveData();
    renderEvents();

    pixelInput.value = "";
    timeInput.value = "";
    colorPicker.value = "#ec4899";
});

// チェックボタンをクリックしたときの完了・未完了の切り替え
function toggleEventStatus(id) {
    events = events.map(event => {
        if (event.id === id) {
            return { ...event, completed: !event.completed };
        }
        return event;
    });
    saveData();
    renderEvents();
}

function saveData() {
    localStorage.setItem('pixel_events', JSON.stringify(events));
}

// 画面への描画処理
function renderEvents() {
    if (!taskList || !scheduleSection) return;
    
    taskList.innerHTML = "";
    scheduleSection.innerHTML = "";

    let mtgCount = 0;

    events.forEach(event => {
        // 1. 左側：カレンダータイムライン（すべてのMTGを表示）
        if (event.type === 'MTG') {
            mtgCount++;
            const scheduleItem = document.createElement('div');
            scheduleItem.className = `schedule-item ${event.completed ? 'is-completed' : ''}`;
            scheduleItem.innerHTML = `
                <span class="schedule-time" style="color: ${event.completed ? '#cbd5e1' : event.color}">${event.time}</span>
                <span class="schedule-title">${event.title}</span>
            `;
            scheduleSection.appendChild(scheduleItem);
        }

        // 2. 右側：タスクリスト（タブによる条件絞り込み）
        if (currentFilter === 'ALL' || currentFilter === event.type) {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card ${event.completed ? 'is-completed' : ''}`;

            if (event.type === 'MTG') {
                taskCard.innerHTML = `
                    <div class="task-check" style="border-color: ${event.completed ? '#cbd5e1' : event.color}; background-color: ${event.completed ? event.color : 'transparent'}" onclick="toggleEventStatus(${event.id})"></div>
                    <div class="task-info">
                        <div class="task-title">${event.title}</div>
                        <div class="task-time">${event.time} <span class="badge-mtg">MTG</span></div>
                    </div>
                `;
            } else {
                const pClass = (event.priority || 'HIGH').toLowerCase();
                taskCard.innerHTML = `
                    <div class="task-check" style="background-color: ${event.completed ? '#94a3b8' : 'transparent'}" onclick="toggleEventStatus(${event.id})"></div>
                    <div class="task-info">
                        <div class="task-title">${event.title}</div>
                        <div class="task-tags">
                            <span class="priority-badge ${pClass}">${event.priority}</span>
                        </div>
                    </div>
                `;
            }
            taskList.appendChild(taskCard);
        }
    });

    if (mtgCount === 0) {
        scheduleSection.innerHTML = '<p class="no-events">No events</p>';
    }
}

// ➔➔➔【超重要】すべての準備が終わった後にこの2つを確実に実行する
loadData();
updateDisplayDate();
renderEvents();