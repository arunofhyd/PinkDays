import { auth, db, appId } from './firebase-config.js';
import {
    initAuth,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signInWithGoogle,
    appSignOut
} from './auth.js';
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Global App State ---
let currentDate = new Date();
let pickerYear = new Date().getFullYear();
let periodData = { periods: [], cycleLength: 28 };
let dataUnsubscribe = () => {};

// --- UI Element References ---
const app = {
    loginView: document.getElementById('login-view'),
    appView: document.getElementById('app-view'),
    messageDisplay: document.getElementById('message-display'),
    messageText: document.getElementById('message-text'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    countdown: document.getElementById('next-period-countdown'),
    nextDate: document.getElementById('next-period-date'),
    nextFertileWindow: document.getElementById('next-fertile-window'),
    avgCycle: document.getElementById('avg-cycle-length'),
    avgPeriod: document.getElementById('avg-period-length'),
    flowAnalysis: document.getElementById('flow-analysis'),
    historyList: document.getElementById('period-history-list'),
    detailedAnalysis: document.getElementById('detailed-analysis'),
    showAnalysisBtn: document.getElementById('show-analysis-btn'),
    analysisArrow: document.getElementById('analysis-arrow'),
    userEmailDisplay: document.getElementById('user-email-display'),
    calendarGrid: document.getElementById('calendar-grid'),
    monthYear: document.getElementById('month-year'),
    prevBtn: document.getElementById('prev-month-btn'),
    nextBtn: document.getElementById('next-month-btn'),
    logPeriodBtn: document.getElementById('log-period-btn'),
    cycleOverrideInput: document.getElementById('cycle-length-input-settings'),
    saveCycleOverrideBtn: document.getElementById('save-cycle-override-btn'),
    recalculateBtn: document.getElementById('recalculate-btn-settings'),
    exportBtn: document.getElementById('export-data-btn'),
    importBtn: document.getElementById('import-data-btn'),
    uploadInput: document.getElementById('upload-data-input'),
    resetBtn: document.getElementById('reset-data-btn'),
    welcomeModal: document.getElementById('welcome-modal'),
    closeWelcomeBtn: document.getElementById('close-welcome-btn'),
    logModal: document.getElementById('log-period-modal'),
    startDateInput: document.getElementById('start-date-input'),
    endDateInput: document.getElementById('end-date-input'),
    dailyFlowContainer: document.getElementById('daily-flow-container'),
    saveLogBtn: document.getElementById('save-log-btn'),
    cancelLogBtn: document.getElementById('cancel-log-btn'),
    monthPickerModal: document.getElementById('month-picker-modal'),
    prevYearBtn: document.getElementById('prev-year-btn'),
    nextYearBtn: document.getElementById('next-year-btn'),
    pickerYearDisplay: document.getElementById('picker-year-display'),
    monthGrid: document.getElementById('month-grid'),
    closeMonthPickerBtn: document.getElementById('close-month-picker-btn'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmOptions: document.getElementById('confirm-options-container')
};

// --- Exported UI Functions for use in auth.js ---
export function showLoginView() {
    app.appView.classList.add('hidden', 'opacity-0', 'scale-95');
    app.loginView.classList.remove('hidden');
    app.loginView.classList.add('opacity-100', 'scale-100');
}

export function showAppView() {
    app.loginView.classList.add('hidden', 'opacity-0', 'scale-95');
    app.appView.classList.remove('hidden');
    app.appView.classList.add('opacity-100', 'scale-100');
}

export function showMessage(text, type = 'info') {
    app.messageText.textContent = text;
    app.messageDisplay.className = `message-${type}`;
    app.messageDisplay.classList.remove('hidden');
    setTimeout(() => {
        app.messageDisplay.classList.add('hidden');
    }, 5000);
}

export function setButtonLoadingState(button, isLoading, originalText = 'Submit') {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
        button.textContent = originalText;
    }
}

// --- Firestore Data Functions ---
export async function migrateDataToFirestore(uid, data) {
    const userDocRef = doc(db, 'artifacts', appId, 'users', uid, 'data', 'pinkDaysData');
    try {
        await setDoc(userDocRef, data, { merge: true });
    } catch (e) {
        console.error("Error migrating data to Firestore:", e);
    }
}

async function loadData() {
    if (localStorage.getItem('sessionMode') === 'offline') {
        const data = localStorage.getItem('pinkDaysData');
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                if (Array.isArray(parsedData.periods) && typeof parsedData.cycleLength === 'number') {
                    periodData = parsedData;
                    periodData.periods.sort((a, b) => a.date.localeCompare(b.date));
                } else {
                    throw new Error("Invalid data structure");
                }
            } catch (e) {
                console.error("Failed to load or parse data from local storage, resetting to default.", e);
                localStorage.removeItem('pinkDaysData');
                showConfirm("Data Error", "Your saved data was corrupted and has been reset.", [{ text: "OK" }]);
            }
        } else {
            app.welcomeModal.classList.remove('hidden');
        }
    }
}

export function startFirestoreSync() {
    if (!db || !auth.currentUser) {
        console.log("Firestore or user ID not available. Cannot start sync.");
        return;
    }
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'data', 'pinkDaysData');

    dataUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.periods) && typeof data.cycleLength === 'number') {
                periodData = data;
                periodData.periods.sort((a, b) => a.date.localeCompare(b.date));
                updateAllUI();
            }
        } else {
            setDoc(userDocRef, periodData, { merge: true });
        }
    }, (error) => {
        console.error("Error listening to Firestore changes:", error);
        showMessage("Failed to sync data with the cloud. Check your connection.", 'error');
    });
}

export function stopFirestoreSync() {
    if (dataUnsubscribe) {
        dataUnsubscribe();
    }
}

async function saveData() {
    periodData.periods.sort((a, b) => a.date.localeCompare(b.date));
    if (localStorage.getItem('sessionMode') === 'offline') {
        localStorage.setItem('pinkDaysData', JSON.stringify(periodData));
        updateAllUI();
    } else if (db && auth.currentUser) {
        try {
            const userDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'data', 'pinkDaysData');
            await setDoc(userDocRef, periodData, { merge: true });
        } catch (error) {
            console.error("An error occurred while saving data to Firestore:", error);
            showConfirm("Save Error", "There was a problem saving your data. Please check your internet connection.", [{text: "OK"}]);
        }
    }
}

// --- Core App UI Update and Logic ---
export function updateAllUI() {
    renderCalendar();
    updateStats();
}

function switchTab(tabName) {
    app.tabPanes.forEach(function(pane) { pane.classList.add('hidden'); });
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    app.tabButtons.forEach(function(btn) {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    localStorage.setItem('pinkDaysLastTab', tabName);
}

function updateStats() {
    var startDates = getPeriodStartDates();
    var calculatedAvgCycle = calculateAverageCycleLength(startDates);
    var effectiveCycleLength = periodData.cycleLength || calculatedAvgCycle;
    var avgPeriod = calculateAveragePeriodLength();

    app.avgCycle.textContent = effectiveCycleLength + ' days';
    app.avgPeriod.textContent = avgPeriod.toFixed(1) + ' days';
    app.cycleOverrideInput.value = effectiveCycleLength;

    var nextDate = getNextPredictedStartDate(startDates, effectiveCycleLength);
    if (nextDate) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var diffTime = nextDate - today;
        var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) app.countdown.textContent = "Today";
        else if (diffDays < 0) app.countdown.textContent = "Overdue";
        else app.countdown.textContent = diffDays + ' day' + (diffDays !== 1 ? 's' : '');

        app.nextDate.textContent = '(' + nextDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }) + ')';
    } else {
        app.countdown.textContent = '--';
        app.nextDate.textContent = 'Log a period to see predictions';
    }

    renderHistory(startDates);
    renderFlowAnalysis();
    renderNextFertileWindow();
}

function renderHistory(startDates) {
    app.historyList.innerHTML = '';
    if (startDates.length === 0) {
        app.historyList.innerHTML = '<li class="text-center text-gray-500">No periods logged yet.</li>';
        return;
    }
    var periodBlocks = getPeriodBlocks(startDates);
    periodBlocks.reverse().slice(0, 5).forEach(function(block) {
        var startDate = fromISODateString(block.start);
        var endDate = fromISODateString(block.end);
        var li = document.createElement('li');
        li.className = 'flex items-center space-x-2 bg-gray-50 p-3 rounded-lg';
        li.innerHTML =
            '<div>' +
            '<p class="font-semibold">' + startDate.toLocaleDateString('default', {month: 'long', day: 'numeric'}) + ' - ' + endDate.toLocaleDateString('default', {month: 'long', day: 'numeric', year: 'numeric'}) + '</p>' +
            '<p class="text-sm text-gray-500">' + block.length + ' days' + (block.cycleLength ? ' (' + block.cycleLength + '-day cycle)' : '') + '</p>' +
            '</div>';
        app.historyList.appendChild(li);
    });
}

function renderFlowAnalysis() {
    var flowDist = calculateFlowDistribution();
    if (flowDist.totalDays === 0) {
        app.flowAnalysis.innerHTML = '<p class="text-center text-gray-500">Log periods to see flow analysis.</p>';
        return;
    }
    app.flowAnalysis.innerHTML =
        `<div class="space-y-3">
            <div class="flex items-center text-sm text-gray-600">
                <span class="font-semibold flex-grow-0 w-20">Light:</span>
                <div class="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden mx-2">
                    <div class="h-full bg-pink-300" style="width: ${(flowDist.light / flowDist.totalDays) * 100}%;"></div>
                </div>
                <span class="w-16 text-right flex-grow-0">${flowDist.light.toFixed(1)} days</span>
            </div>
            <div class="flex items-center text-sm text-gray-600">
                <span class="font-semibold flex-grow-0 w-20">Medium:</span>
                <div class="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden mx-2">
                    <div class="h-full bg-pink-400" style="width: ${(flowDist.medium / flowDist.totalDays) * 100}%;"></div>
                </div>
                <span class="w-16 text-right flex-grow-0">${flowDist.medium.toFixed(1)} days</span>
            </div>
            <div class="flex items-center text-sm text-gray-600">
                <span class="font-semibold flex-grow-0 w-20">Heavy:</span>
                <div class="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden mx-2">
                    <div class="h-full bg-pink-500" style="width: ${(flowDist.heavy / flowDist.totalDays) * 100}%;"></div>
                </div>
                <span class="w-16 text-right flex-grow-0">${flowDist.heavy.toFixed(1)} days</span>
            </div>
        </div>`;
}

function renderNextFertileWindow() {
    var window = getNextFertileWindow();
    if (window) {
        var start = fromISODateString(window.start);
        var end = fromISODateString(window.end);
        app.nextFertileWindow.innerHTML = `<span class="text-3xl">${start.toLocaleDateString('default', {month: 'short', day: 'numeric'})}</span> - <span class="text-3xl">${end.toLocaleDateString('default', {month: 'short', day: 'numeric'})}</span>`;
    } else {
        app.nextFertileWindow.textContent = '--';
    }
}

function renderCalendar() {
    app.calendarGrid.innerHTML = '';
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth();
    app.monthYear.textContent = currentDate.toLocaleString('default', { month: 'long' }) + ' ' + year;

    var firstDayOfMonth = new Date(year, month, 1);
    var lastDayOfMonth = new Date(year, month + 1, 0);

    for (var i = 0; i < firstDayOfMonth.getDay(); i++) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'day disabled';
        app.calendarGrid.appendChild(emptyDiv);
    }

    var todayStr = toISODateString(new Date());
    var predictedDates = getPredictedDates();
    var fertileDates = getAllFertileDates();

    for (var i = 1; i <= lastDayOfMonth.getDate(); i++) {
        var dayDate = new Date(year, month, i);
        var dayStr = toISODateString(dayDate);
        var classes = 'day cursor-pointer';

        var periodDay = periodData.periods.find(function(p) { return p.date === dayStr; });
        if (periodDay) {
            classes += ' flow-' + periodDay.flow;
        } else if (fertileDates.indexOf(dayStr) !== -1) {
            classes += ' fertile-day';
        } else if (predictedDates.indexOf(dayStr) !== -1) {
            classes += ' predicted-day';
        }

        if (dayStr === todayStr) classes += ' today';
        if (dayDate.getDay() === 0) classes += ' sunday-text';

        var dayEl = document.createElement('div');
        dayEl.textContent = i;
        dayEl.className = classes;
        dayEl.addEventListener('click', (function(dateStr) {
            return function() {
                var block = findPeriodBlockForDate(dateStr);
                showLogPeriodModal(block ? block.start : dateStr, block ? block.end : dateStr);
            };
        })(dayStr));
        app.calendarGrid.appendChild(dayEl);
    }
}

function openMonthPicker() {
    pickerYear = currentDate.getFullYear();
    app.monthPickerModal.classList.remove('hidden');
    renderMonthGrid();
}

function renderMonthGrid() {
    app.monthGrid.innerHTML = '';
    app.pickerYearDisplay.textContent = pickerYear;
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (var i = 0; i < 12; i++) {
        var monthBtn = document.createElement('button');
        monthBtn.textContent = monthNames[i];
        monthBtn.className = 'month-picker-btn';
        if (i === currentDate.getMonth() && pickerYear === currentDate.getFullYear()) {
            monthBtn.classList.add('active');
        }
        monthBtn.addEventListener('click', (function(monthIndex) {
            return function() {
                currentDate.setFullYear(pickerYear);
                currentDate.setMonth(monthIndex);
                renderCalendar();
                app.monthPickerModal.classList.add('hidden');
            };
        })(i));
        app.monthGrid.appendChild(monthBtn);
    }
}

function toISODateString(date) {
    var pad = function(num) { return (num < 10 ? '0' : '') + num; };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function fromISODateString(str) {
    return new Date(str + 'T00:00:00');
}

function getPeriodStartDates() {
    var cycleStarts = [];
    if (periodData.periods.length === 0) return [];

    cycleStarts.push(periodData.periods[0].date);
    for (var i = 1; i < periodData.periods.length; i++) {
        var prevDate = fromISODateString(periodData.periods[i - 1].date);
        var currDate = fromISODateString(periodData.periods[i].date);
        var diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 1) cycleStarts.push(periodData.periods[i].date);
    }
    return cycleStarts.filter(function(value, index, self) {
        return self.indexOf(value) === index;
    });
}

function getPeriodBlocks(startDates) {
    return startDates.map(function(start, i) {
        var endDate = start;
        var length = 1;
        var currentDate = fromISODateString(start);

        while(true) {
            var nextDay = new Date(currentDate);
            nextDay.setDate(nextDay.getDate() + 1);
            var nextDayStr = toISODateString(nextDay);
            if (periodData.periods.find(function(p) { return p.date === nextDayStr; })) {
                endDate = nextDayStr;
                length++;
                currentDate = nextDay;
            } else {
                break;
            }
        }
        var cycleLength = i > 0 ? (fromISODateString(start) - fromISODateString(startDates[i-1])) / (1000 * 60 * 60 * 24) : null;
        return { start: start, end: endDate, length: length, cycleLength: cycleLength };
    });
}

function findPeriodBlockForDate(dateStr) {
    if (!periodData.periods.find(function(p) { return p.date === dateStr; })) return null;
    var blocks = getPeriodBlocks(getPeriodStartDates());
    return blocks.find(function(b) { return dateStr >= b.start && dateStr <= b.end; });
}

function calculateAverageCycleLength(startDates) {
    if (startDates.length < 2) return periodData.cycleLength || 28;
    var totalDiff = 0;
    for (var i = 1; i < startDates.length; i++) {
        totalDiff += (fromISODateString(startDates[i]) - fromISODateString(startDates[i-1]));
    }
    var avg = Math.round(totalDiff / (1000 * 60 * 60 * 24) / (startDates.length - 1));
    return avg > 10 ? avg : (periodData.cycleLength || 28);
}

function calculateAveragePeriodLength() {
    var blocks = getPeriodBlocks(getPeriodStartDates());
    if (blocks.length === 0) return 0;
    var totalLength = blocks.reduce(function(sum, b) { return sum + b.length; }, 0);
    return totalLength / blocks.length;
}

function calculateFlowDistribution() {
    var blocks = getPeriodBlocks(getPeriodStartDates());
    if (blocks.length === 0) return { light: 0, medium: 0, heavy: 0, totalDays: 0 };
    var counts = { light: 0, medium: 0, heavy: 0 };
    periodData.periods.forEach(function(p) {
        if (counts.hasOwnProperty(p.flow)) {
            counts[p.flow]++;
        }
    });
    return {
        light: counts.light / blocks.length,
        medium: counts.medium / blocks.length,
        heavy: counts.heavy / blocks.length,
        totalDays: periodData.periods.length
    };
}

function getNextPredictedStartDate(startDates, cycleLen) {
    if (startDates.length === 0) return null;
    var lastStartDate = fromISODateString(startDates[startDates.length - 1]);
    lastStartDate.setDate(lastStartDate.getDate() + cycleLen);
    return lastStartDate;
}

function getPredictedDates() {
    var nextStartDate = getNextPredictedStartDate(getPeriodStartDates(), periodData.cycleLength);
    if (!nextStartDate) return [];
    var dates = [];
    var avgPeriodLength = Math.round(calculateAveragePeriodLength()) || 5;
    for (var i = 0; i < avgPeriodLength; i++) {
        var date = new Date(nextStartDate);
        date.setDate(date.getDate() + i);
        dates.push(toISODateString(date));
    }
    return dates;
}

function getNextFertileWindow() {
    var nextStartDate = getNextPredictedStartDate(getPeriodStartDates(), periodData.cycleLength);
    if (!nextStartDate) return null;
    var ovulationDay = new Date(nextStartDate);
    ovulationDay.setDate(ovulationDay.getDate() - 14);
    var windowStart = new Date(ovulationDay);
    windowStart.setDate(windowStart.getDate() - 5);
    return { start: toISODateString(windowStart), end: toISODateString(ovulationDay) };
}

function getAllFertileDates() {
    var startDates = getPeriodStartDates();
    var fertileDatesSet = [];

    function addWindow(cycleEndDate) {
        if (!cycleEndDate) return;
        var ovulationDay = new Date(cycleEndDate);
        ovulationDay.setDate(ovulationDay.getDate() - 14);
        for (var i = 5; i >= 0; i--) {
            var date = new Date(ovulationDay);
            date.setDate(date.getDate() - i);
            var dateStr = toISODateString(date);
            if (fertileDatesSet.indexOf(dateStr) === -1) {
                fertileDatesSet.push(dateStr);
            }
        }
    }

    if (startDates.length >= 1) {
        for (var i = 1; i < startDates.length; i++) {
            addWindow(fromISODateString(startDates[i]));
        }
    }
    addWindow(getNextPredictedStartDate(startDates, periodData.cycleLength));
    return fertileDatesSet;
}

function showLogPeriodModal(start, end) {
    app.startDateInput.value = start;
    app.endDateInput.value = end;
    updateDailyFlowSelectors();
    app.logModal.classList.remove('hidden');
}

function updateDailyFlowSelectors() {
    app.dailyFlowContainer.innerHTML = '';
    var start = fromISODateString(app.startDateInput.value);
    var end = fromISODateString(app.endDateInput.value);
    if (!app.startDateInput.value || !app.endDateInput.value || start > end) return;

    var current = new Date(start);
    while(current <= end) {
        var dayStr = toISODateString(current);
        var existingLog = periodData.periods.find(function(p) { return p.date === dayStr; });
        var flow = existingLog ? existingLog.flow : 'medium';

        var dayEl = document.createElement('div');
        dayEl.className = 'flex justify-between items-center bg-white p-2 rounded';
        dayEl.innerHTML =
            '<span class="text-sm font-medium">' + current.toLocaleDateString('default', {weekday: 'short', month: 'short', day: 'numeric'}) + '</span>' +
            '<div class="flex gap-1 items-center" data-date="' + dayStr + '">' +
            '<button data-flow="light" class="px-3 py-1 text-xs rounded ' + (flow === 'light' ? 'flow-light' : 'bg-gray-200') + '">Light</button>' +
            '<button data-flow="medium" class="px-3 py-1 text-xs rounded ' + (flow === 'medium' ? 'flow-medium' : 'bg-gray-200') + '">Medium</button>' +
            '<button data-flow="heavy" class="px-3 py-1 text-xs rounded ' + (flow === 'heavy' ? 'flow-heavy' : 'bg-gray-200') + '">Heavy</button>' +
            '<button data-action="delete" class="ml-2 text-gray-400 hover:text-red-500"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"></path></svg></button>' +
            '</div>';
        app.dailyFlowContainer.appendChild(dayEl);
        current.setDate(current.getDate() + 1);
    }
}

function showConfirm(title, message, options) {
    app.confirmTitle.textContent = title;
    app.confirmMessage.textContent = message;
    app.confirmOptions.innerHTML = '';
    options.forEach(function(option) {
        var btn = document.createElement('button');
        btn.textContent = option.text;
        var style = option.style || 'main-gradient-box';
        if (style === 'cancel') {
            btn.className = 'w-full bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300';
        } else if (style === 'bg-red-600') {
            btn.className = 'w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-red-700 transition-colors';
        } else {
            btn.className = 'w-full text-white font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 transition-opacity ' + style;
        }
        btn.onclick = function() {
            if (option.action) option.action();
            app.confirmModal.classList.add('hidden');
        };
        app.confirmOptions.appendChild(btn);
    });
    app.confirmModal.classList.remove('hidden');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    // Tabs and main navigation
    app.tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    app.prevBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    app.nextBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    app.monthYear.addEventListener('click', openMonthPicker);
    app.prevYearBtn.addEventListener('click', () => { pickerYear--; renderMonthGrid(); });
    app.nextYearBtn.addEventListener('click', () => { pickerYear++; renderMonthGrid(); });
    app.closeMonthPickerBtn.addEventListener('click', () => app.monthPickerModal.classList.add('hidden'));
    app.logPeriodBtn.addEventListener('click', () => showLogPeriodModal(toISODateString(new Date()), toISODateString(new Date())));
    app.closeWelcomeBtn.addEventListener('click', () => app.welcomeModal.classList.add('hidden'));
    app.showAnalysisBtn.addEventListener('click', () => {
        app.detailedAnalysis.classList.toggle('hidden');
        app.analysisArrow.textContent = app.detailedAnalysis.classList.contains('hidden') ? '+' : '−';
    });
    app.startDateInput.addEventListener('change', updateDailyFlowSelectors);
    app.endDateInput.addEventListener('change', updateDailyFlowSelectors);

    // Modal and form handling
    app.dailyFlowContainer.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            var button = e.target.closest('button');
            if (button.dataset.action === 'delete') {
                var row = button.closest('[data-date]');
                var dateToDelete = row.dataset.date;
                periodData.periods = periodData.periods.filter(p => p.date !== dateToDelete);
                row.remove();
            } else if (button.dataset.flow) {
                var buttons = button.parentElement.querySelectorAll('button[data-flow]');
                buttons.forEach(b => {
                    b.classList.remove('flow-light', 'flow-medium', 'flow-heavy');
                    b.classList.add('bg-gray-200');
                });
                button.classList.remove('bg-gray-200');
                button.classList.add('flow-' + button.dataset.flow);
            }
        }
    });

    app.saveLogBtn.addEventListener('click', async () => {
        var start = app.startDateInput.value;
        var end = app.endDateInput.value;
        if (!start || !end || fromISODateString(start) > fromISODateString(end)) {
            showConfirm("Invalid Dates", "Please ensure the start date is not after the end date.", [{text: "OK"}]);
            return;
        }
        periodData.periods = periodData.periods.filter(p => p.date < start || p.date > end);
        var flowRows = app.dailyFlowContainer.querySelectorAll('[data-date]');
        flowRows.forEach(row => {
            var date = row.dataset.date;
            var selectedBtn = row.querySelector('button[class*="flow-"]');
            if(selectedBtn) {
                var flow = selectedBtn.dataset.flow;
                periodData.periods.push({date: date, flow: flow});
            }
        });
        await saveData();
        app.logModal.classList.add('hidden');
    });
    app.cancelLogBtn.addEventListener('click', () => app.logModal.classList.add('hidden'));
    app.saveCycleOverrideBtn.addEventListener('click', async () => {
        var val = parseInt(app.cycleOverrideInput.value);
        if (val > 10) {
            periodData.cycleLength = val;
            await saveData();
            showConfirm("Success", "Cycle length has been updated.", [{text: "OK"}]);
        } else {
            showConfirm("Invalid Input", "Please enter a cycle length greater than 10 days.", [{text: "OK"}]);
        }
    });
    app.recalculateBtn.addEventListener('click', async () => {
         var avg = calculateAverageCycleLength(getPeriodStartDates());
         periodData.cycleLength = avg;
         app.cycleOverrideInput.value = avg;
         await saveData();
         showConfirm("Success", "Cycle length has been recalculated to " + avg + " days.", [{text: "OK"}]);
    });

    // Data import/export and reset
    app.exportBtn.addEventListener('click', () => {
        var dataStr = JSON.stringify(periodData, null, 2);
        var blob = new Blob([dataStr], {type: "application/json"});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'pinkdays_backup_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 500);
    });
    app.importBtn.addEventListener('click', () => app.uploadInput.click());
    app.uploadInput.addEventListener('change', async e => {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = async event => {
            try {
                var uploadedData = JSON.parse(event.target.result);
                if (!uploadedData.periods || !uploadedData.hasOwnProperty('cycleLength')) {
                    throw new Error("Invalid file format");
                }
                var newPeriods = {};
                periodData.periods.forEach(p => newPeriods[p.date] = p);
                uploadedData.periods.forEach(p => newPeriods[p.date] = p);
                periodData.periods = Object.values ? Object.values(newPeriods) : Object.keys(newPeriods).map(key => newPeriods[key]);
                periodData.cycleLength = uploadedData.cycleLength;
                await saveData();
                showConfirm("Success", "Data has been merged.", [{text: "OK"}]);
            } catch (err) {
                showConfirm("Upload Error", "The selected file is not a valid PinkDays backup.", [{text: "OK"}]);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
    app.resetBtn.addEventListener('click', () => showConfirm("Reset All Data?", "This action cannot be undone and will delete all your cycle history.", [
        { text: "Cancel", style: 'cancel' },
        { text: "Yes, Reset", action: async () => { periodData = { periods: [], cycleLength: 28 }; await saveData(); }, style: 'bg-red-600' }
    ]));

    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const passwordToggleBtn = document.getElementById('password-toggle-btn');
    const passwordToggleIcon = document.getElementById('password-toggle-icon');
    const emailSignInBtn = document.getElementById('email-signin-btn');
    const emailSignUpBtn = document.getElementById('email-signup-btn');
    const googleSignInBtn = document.getElementById('google-signin-btn');
    const anonContinueBtn = document.getElementById('anon-continue-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');

    passwordToggleBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggleIcon.classList.remove('fa-eye');
            passwordToggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            passwordToggleIcon.classList.remove('fa-eye-slash');
            passwordToggleIcon.classList.add('fa-eye');
        }
    });

    emailSignInBtn.addEventListener('click', () => signInWithEmail(emailInput.value, passwordInput.value));
    emailSignUpBtn.addEventListener('click', () => signUpWithEmail(emailInput.value, passwordInput.value));
    googleSignInBtn.addEventListener('click', signInWithGoogle);
    signOutBtn.addEventListener('click', appSignOut);
    forgotPasswordBtn.addEventListener('click', () => resetPassword(emailInput.value));
    anonContinueBtn.addEventListener('click', () => {
        localStorage.setItem('sessionMode', 'offline');
        showAppView();
        updateAllUI();
    });

    initAuth();
    loadData();
    var lastTab = localStorage.getItem('pinkDaysLastTab') || 'stats';
    switchTab(lastTab);
});
