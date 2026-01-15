// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDEK9OgZ0PphoukTJb9uB1J_0de8Dtf0QA",
    authDomain: "pinkdaysaoh.firebaseapp.com",
    projectId: "pinkdaysaoh",
    storageBucket: "pinkdaysaoh.firebasestorage.app",
    messagingSenderId: "16168022769",
    appId: "1:16168022769:web:a7a4daf40c7bf11b56af50"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// --- GLOBAL STATE ---
let currentUser = null;
let isOfflineMode = false;
let cycleChartInstance = null;

// --- DOM Elements (Auth) ---
const authContainer = document.getElementById('auth-container');
const appWrapper = document.getElementById('app-wrapper');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const signinBtn = document.getElementById('signin-btn');
const signupBtn = document.getElementById('signup-btn');
const googleSigninBtn = document.getElementById('google-signin-btn');
const offlineBtn = document.getElementById('offline-btn');
const passwordToggle = document.getElementById('password-toggle');
const eyeOpenIcon = document.getElementById('eye-open-icon');
const eyeClosedIcon = document.getElementById('eye-closed-icon');
const userControlsContainer = document.getElementById('user-controls');
const authErrorMessage = document.getElementById('auth-error-message');
const forgotPasswordLink = document.getElementById('forgot-password-link');

// --- Transition Functions ---
const TRANSITION_DURATION = 500; // Match CSS duration in milliseconds
function showAuthScreen() {
    appWrapper.classList.add('is-transparent');
    setTimeout(() => {
        appWrapper.classList.add('hidden');
        authContainer.classList.remove('hidden');
        requestAnimationFrame(() => {
            authContainer.classList.remove('is-transparent');
        });
    }, TRANSITION_DURATION);
}

function showAppScreen() {
    authContainer.classList.add('is-transparent');
    setTimeout(() => {
        authContainer.classList.add('hidden');
        appWrapper.classList.remove('hidden');
        requestAnimationFrame(() => {
            appWrapper.classList.remove('is-transparent');
        });
    }, TRANSITION_DURATION);
}

// --- App Logic ---
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    var app = {
        tabButtons: document.querySelectorAll('.tab-btn'), tabPanes: document.querySelectorAll('.tab-pane'),
        countdown: document.getElementById('next-period-countdown'), nextDate: document.getElementById('next-period-date'), nextFertileWindow: document.getElementById('next-fertile-window'), avgCycle: document.getElementById('avg-cycle-length'), avgPeriod: document.getElementById('avg-period-length'), flowAnalysis: document.getElementById('flow-analysis'), historyList: document.getElementById('period-history-list'), detailedAnalysis: document.getElementById('detailed-analysis'), showAnalysisBtn: document.getElementById('show-analysis-btn'), analysisArrow: document.getElementById('analysis-arrow'),
        calendarGrid: document.getElementById('calendar-grid'), monthYear: document.getElementById('month-year'), prevBtn: document.getElementById('prev-month-btn'), nextBtn: document.getElementById('next-month-btn'), logPeriodBtn: document.getElementById('log-period-btn'),
        cycleOverrideInput: document.getElementById('cycle-length-input-settings'), saveCycleOverrideBtn: document.getElementById('save-cycle-override-btn'), recalculateBtn: document.getElementById('recalculate-btn-settings'), exportBtn: document.getElementById('export-data-btn'), importBtn: document.getElementById('import-data-btn'), uploadInput: document.getElementById('upload-data-input'), resetBtn: document.getElementById('reset-data-btn'),
        welcomeModal: document.getElementById('welcome-modal'), closeWelcomeBtn: document.getElementById('close-welcome-btn'), logModal: document.getElementById('log-period-modal'), startDateInput: document.getElementById('start-date-input'), endDateInput: document.getElementById('end-date-input'), dailyFlowContainer: document.getElementById('daily-flow-container'), saveLogBtn: document.getElementById('save-log-btn'), cancelLogBtn: document.getElementById('cancel-log-btn'), monthPickerModal: document.getElementById('month-picker-modal'), prevYearBtn: document.getElementById('prev-year-btn'), nextYearBtn: document.getElementById('next-year-btn'), pickerYearDisplay: document.getElementById('picker-year-display'), monthGrid: document.getElementById('month-grid'), closeMonthPickerBtn: document.getElementById('close-month-picker-btn'), confirmModal: document.getElementById('confirm-modal'), confirmTitle: document.getElementById('confirm-title'), confirmMessage: document.getElementById('confirm-message'), confirmOptions: document.getElementById('confirm-options-container'),
        darkModeToggle: document.getElementById('dark-mode-toggle'), darkModeIndicator: document.getElementById('dark-mode-indicator')
    };

    // --- State ---
    var currentDate = new Date();
    var pickerYear = new Date().getFullYear();
    var periodData = {
        periods: [],
        cycleLength: 28
    };

    // --- INITIAL APP LOAD ---
    function initializeApp() {
        if (localStorage.getItem('pinkDaysOfflineMode') === 'true') {
            isOfflineMode = true;
            currentUser = null;
            appWrapper.classList.remove('hidden', 'is-transparent');
            authContainer.classList.add('hidden');
            loadDataFromLocalStorage();
            addOfflineExitButton();
        } else {
            onAuthStateChanged(auth, handleAuthState);
        }
    }

    // --- AUTHENTICATION LOGIC ---
    function setButtonState(button, isLoading) {
        const spinner = button.querySelector('.fa-spinner');
        const text = button.querySelector('.button-text');
        const icon = button.querySelector('.button-icon');

        if (isLoading) {
            button.disabled = true;
            button.style.pointerEvents = 'none';
            if (text) text.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            button.style.pointerEvents = 'auto';
            if (text) text.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    }

    async function handleAuthState(user) {
        if (user) {
            currentUser = user;
            isOfflineMode = false;
            localStorage.removeItem('pinkDaysOfflineMode');
            showAppScreen();
            await loadDataFromFirestore();
            addLogoutButton();
        } else {
            currentUser = null;
            if (!isOfflineMode) {
                showAuthScreen();
            }
            resetAppData();
            userControlsContainer.innerHTML = '';
        }
    }

    const createExitButton = (id, title) => {
        const button = document.createElement('button');
        button.id = id;
        button.title = title;
        button.className = "p-2 h-10 w-10 flex items-center justify-center text-gray-500 bg-gray-200 rounded-full hover:bg-pink-100 hover:text-pink-500 transition-colors duration-200";
        button.innerHTML = `<i class="fas fa-right-from-bracket"></i>`;
        return button;
    }

    const addLogoutButton = () => {
        userControlsContainer.innerHTML = '';
        const logoutBtn = createExitButton('logout-btn', 'Logout');
        logoutBtn.addEventListener('click', async () => await signOut(auth));
        userControlsContainer.appendChild(logoutBtn);
    };

    const addOfflineExitButton = () => {
        userControlsContainer.innerHTML = '';
        const exitBtn = createExitButton('exit-offline-btn', 'Exit Offline Mode');
        exitBtn.addEventListener('click', () => {
            isOfflineMode = false;
            localStorage.removeItem('pinkDaysOfflineMode');
            showAuthScreen();
        });
        userControlsContainer.appendChild(exitBtn);
    };

    const resetAppData = () => {
        periodData = { periods: [], cycleLength: 28 };
        updateAllUI();
    };

    const setAuthMessage = (message, isError = true) => {
        authErrorMessage.textContent = message;
        authErrorMessage.className = `text-sm mt-4 text-center h-4 ${isError ? 'text-red-500' : 'text-green-600'}`;
    };

    passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeOpenIcon.classList.toggle('hidden');
        eyeClosedIcon.classList.toggle('hidden');
    });

    signupBtn.addEventListener('click', async () => {
        setAuthMessage('');
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return setAuthMessage("Please enter email and password.");
        if (password.length < 6) return setAuthMessage("Password must be at least 6 characters.");

        setButtonState(signupBtn, true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthMessage(error.message);
            setButtonState(signupBtn, false);
        }
    });

    signinBtn.addEventListener('click', async () => {
        setAuthMessage('');
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return setAuthMessage("Please enter email and password.");

        setButtonState(signinBtn, true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthMessage("Invalid email or password. Please try again.");
            setButtonState(signinBtn, false);
        }
    });

    googleSigninBtn.addEventListener('click', async () => {
        setAuthMessage('');
        setButtonState(googleSigninBtn, true);
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            setAuthMessage(error.message);
            setButtonState(googleSigninBtn, false);
        }
    });

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        setAuthMessage('');
        if (!emailInput.value) return setAuthMessage('Please enter your email to reset password.');
        try {
            await sendPasswordResetEmail(auth, emailInput.value);
            setAuthMessage('Password reset email sent! Check your inbox.', false);
        } catch (error) { setAuthMessage(error.message); }
    });

    offlineBtn.addEventListener('click', () => {
        isOfflineMode = true;
        currentUser = null;
        localStorage.setItem('pinkDaysOfflineMode', 'true');
        showAppScreen();
        loadDataFromLocalStorage();
        addOfflineExitButton();
    });

    // --- DATA MANAGEMENT ---
    async function loadDataFromFirestore() {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            periodData = (Array.isArray(data.periods) && typeof data.cycleLength === 'number') ? data : { periods: [], cycleLength: 28 };
        } else {
            periodData = { periods: [], cycleLength: 28 };
            app.welcomeModal.classList.remove('hidden');
        }
        initializeAppUI();
    }

    function loadDataFromLocalStorage() {
        const data = localStorage.getItem('pinkDaysData');
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                if (Array.isArray(parsedData.periods) && typeof parsedData.cycleLength === 'number') {
                    periodData = parsedData;
                } else throw new Error("Invalid data structure");
            } catch (e) {
                localStorage.removeItem('pinkDaysData');
                showConfirm("Data Error", "Your local data was corrupted and has been reset.", [{ text: "OK" }]);
            }
        } else {
            app.welcomeModal.classList.remove('hidden');
        }
        initializeAppUI();
    }

    async function saveData() {
        periodData.periods.sort((a, b) => a.date.localeCompare(b.date));
        try {
            if (isOfflineMode) {
                localStorage.setItem('pinkDaysData', JSON.stringify(periodData));
            } else if (currentUser) {
                await setDoc(doc(db, 'users', currentUser.uid), periodData);
            }
            updateAllUI();
        } catch (error) {
            showConfirm("Save Error", "Could not save your data. Please check your connection.", [{ text: "OK" }]);
        }
    }

    function initializeAppUI() {
        periodData.periods.sort((a, b) => a.date.localeCompare(b.date));
        const lastTab = localStorage.getItem('pinkDaysLastTab') || 'stats';
        switchTab(lastTab);
        updateAllUI();
    }

    // --- DARK MODE ---
    function toggleDarkMode() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('pinkDaysDarkMode', isDark);
        updateDarkModeToggleUI(isDark);
        updateAllUI(); // Refresh UI components (like Chart) that depend on theme
    }
    function updateDarkModeToggleUI(isDark) {
        if (isDark) {
            app.darkModeToggle.classList.remove('bg-gray-200');
            app.darkModeToggle.classList.add('bg-pink-600');
            app.darkModeIndicator.classList.remove('translate-x-1');
            app.darkModeIndicator.classList.add('translate-x-6');
        } else {
            app.darkModeToggle.classList.add('bg-gray-200');
            app.darkModeToggle.classList.remove('bg-pink-600');
            app.darkModeIndicator.classList.add('translate-x-1');
            app.darkModeIndicator.classList.remove('translate-x-6');
        }
    }

    // --- ALL OTHER APP FUNCTIONS ---
    function toISODateString(date) { var pad = function(num) { return (num < 10 ? '0' : '') + num; }; return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
    function fromISODateString(str) { return new Date(str + 'T00:00:00'); }
    function updateAllUI() { renderCalendar(); updateStats(); }
    function switchTab(tabName) { app.tabPanes.forEach(function(pane) { pane.classList.add('hidden'); }); document.getElementById(tabName + '-tab').classList.remove('hidden'); app.tabButtons.forEach(function(btn) { if (btn.dataset.tab === tabName) { btn.classList.add('active'); } else { btn.classList.remove('active'); } }); localStorage.setItem('pinkDaysLastTab', tabName); }

    // Helper to get log entry
    function getLog(dateStr) { return periodData.periods.find(p => p.date === dateStr); }
    function isPeriodDay(dateStr) { const log = getLog(dateStr); return log && log.flow; }

    function updateStats() { var startDates = getPeriodStartDates(); var calculatedAvgCycle = calculateAverageCycleLength(startDates); var effectiveCycleLength = periodData.cycleLength || calculatedAvgCycle; var avgPeriod = calculateAveragePeriodLength(); app.avgCycle.textContent = effectiveCycleLength + ' days'; app.avgPeriod.textContent = avgPeriod.toFixed(1) + ' days'; app.cycleOverrideInput.value = effectiveCycleLength; var nextDate = getNextPredictedStartDate(startDates, effectiveCycleLength); if (nextDate) { var today = new Date(); today.setHours(0, 0, 0, 0); var diffTime = nextDate - today; var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays === 0) app.countdown.textContent = "Today"; else if (diffDays < 0) app.countdown.textContent = "Overdue"; else app.countdown.textContent = diffDays + ' day' + (diffDays !== 1 ? 's' : ''); app.nextDate.textContent = '(' + nextDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }) + ')'; } else { app.countdown.textContent = '--'; app.nextDate.textContent = 'Log a period to see predictions'; } renderHistory(startDates); renderFlowAnalysis(); renderNextFertileWindow(); renderCycleHistoryChart(startDates); }

    function renderHistory(startDates) {
        app.historyList.innerHTML = '';
        if (startDates.length === 0) { app.historyList.innerHTML = '<li class="text-center text-gray-500">No periods logged yet.</li>'; return; }
        var periodBlocks = getPeriodBlocks(startDates);
        periodBlocks.reverse().slice(0, 5).forEach(function(block) {
            var startDate = fromISODateString(block.start);
            var endDate = fromISODateString(block.end);
            var li = document.createElement('li');
            li.className = 'flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg';
            li.innerHTML =  '<div>' + '<p class="font-semibold">' + startDate.toLocaleDateString('default', {month: 'long', day: 'numeric'}) + ' - ' + endDate.toLocaleDateString('default', {month: 'long', day: 'numeric', year: 'numeric'}) + '</p>' + '<p class="text-sm text-gray-500 dark:text-gray-400">' + block.length + ' days' + (block.cycleLength ? ' (' + block.cycleLength + '-day cycle)' : '') + '</p>' + '</div>';
            app.historyList.appendChild(li);
        });
    }

    function renderFlowAnalysis() {
        var flowDist = calculateFlowDistribution();
        if (flowDist.totalDays === 0) { app.flowAnalysis.innerHTML = '<p class="text-center text-gray-500">Log periods to see flow analysis.</p>'; return; }
        app.flowAnalysis.innerHTML =  `<div class="space-y-3"> <div class="flex items-center text-sm text-gray-600 dark:text-gray-300"> <span class="font-semibold flex-grow-0 w-20">Light:</span> <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mx-2"> <div class="h-full bg-pink-300" style="width: ${(flowDist.light / flowDist.totalDays) * 100}%;"></div> </div> <span class="w-16 text-right flex-grow-0">${flowDist.light.toFixed(1)} days</span> </div> <div class="flex items-center text-sm text-gray-600 dark:text-gray-300"> <span class="font-semibold flex-grow-0 w-20">Medium:</span> <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mx-2"> <div class="h-full bg-pink-400" style="width: ${(flowDist.medium / flowDist.totalDays) * 100}%;"></div> </div> <span class="w-16 text-right flex-grow-0">${flowDist.medium.toFixed(1)} days</span> </div> <div class="flex items-center text-sm text-gray-600 dark:text-gray-300"> <span class="font-semibold flex-grow-0 w-20">Heavy:</span> <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mx-2"> <div class="h-full bg-pink-500" style="width: ${(flowDist.heavy / flowDist.totalDays) * 100}%;"></div> </div> <span class="w-16 text-right flex-grow-0">${flowDist.heavy.toFixed(1)} days</span> </div> </div>`;
    }

    function renderNextFertileWindow() { var window = getNextFertileWindow(); if (window) { var start = fromISODateString(window.start); var end = fromISODateString(window.end); app.nextFertileWindow.innerHTML = `<span class="text-3xl">${start.toLocaleDateString('default', {month: 'short', day: 'numeric'})}</span> - <span class="text-3xl">${end.toLocaleDateString('default', {month: 'short', day: 'numeric'})}</span>`; } else { app.nextFertileWindow.textContent = '--'; } }

    function renderCycleHistoryChart(startDates) {
        const canvas = document.getElementById('cycle-history-chart');
        if (!canvas) return; // Guard in case element is missing
        const ctx = canvas.getContext('2d');

        if (!startDates || startDates.length < 2) {
             if (cycleChartInstance) {
                cycleChartInstance.destroy();
                cycleChartInstance = null;
            }
            return;
        }

        const labels = [];
        const data = [];

        for (let i = 1; i < startDates.length; i++) {
            const prev = fromISODateString(startDates[i-1]);
            const curr = fromISODateString(startDates[i]);
            const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

            labels.push(curr.toLocaleDateString('default', {month: 'short', day: 'numeric'}));
            data.push(diff);
        }

        if (cycleChartInstance) {
            cycleChartInstance.destroy();
        }

        const isDark = document.body.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#d1d5db' : '#374151';

        cycleChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cycle Length (days)',
                    data: data,
                    borderColor: '#ff5c7c',
                    backgroundColor: 'rgba(255, 92, 124, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff5c7c'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });
    }

    function renderCalendar() {
        app.calendarGrid.innerHTML = '';
        var year = currentDate.getFullYear();
        var month = currentDate.getMonth();
        app.monthYear.textContent = currentDate.toLocaleString('default', { month: 'long' }) + ' ' + year;
        var firstDayOfMonth = new Date(year, month, 1);
        var lastDayOfMonth = new Date(year, month + 1, 0);
        for (var i = 0; i < firstDayOfMonth.getDay(); i++) { var emptyDiv = document.createElement('div'); emptyDiv.className = 'day disabled'; app.calendarGrid.appendChild(emptyDiv); }
        var todayStr = toISODateString(new Date());
        var predictedDates = getPredictedDates();
        var fertileDates = getAllFertileDates();
        for (var i = 1; i <= lastDayOfMonth.getDate(); i++) {
            var dayDate = new Date(year, month, i);
            var dayStr = toISODateString(dayDate);
            var classes = 'day cursor-pointer relative';
            var periodDay = getLog(dayStr);

            if (periodDay && periodDay.flow) { classes += ' flow-' + periodDay.flow; }
            else if (fertileDates.indexOf(dayStr) !== -1) { classes += ' fertile-day'; }
            else if (predictedDates.indexOf(dayStr) !== -1) { classes += ' predicted-day'; }

            if (dayStr === todayStr) classes += ' today';
            if (dayDate.getDay() === 0) classes += ' sunday-text';

            var dayEl = document.createElement('div');
            dayEl.className = classes;
            dayEl.innerHTML = `<span class="z-10">${i}</span>`;

            if (periodDay && (periodDay.mood || (periodDay.symptoms && periodDay.symptoms.length > 0))) {
                dayEl.innerHTML += `<span style="position: absolute; bottom: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background-color: #a855f7;"></span>`;
            }

            dayEl.addEventListener('click', (function(dateStr) { return function() { var block = findPeriodBlockForDate(dateStr); showLogPeriodModal(block ? block.start : dateStr, block ? block.end : dateStr); }; })(dayStr));
            app.calendarGrid.appendChild(dayEl);
        }
    }

    function openMonthPicker() { pickerYear = currentDate.getFullYear(); app.monthPickerModal.classList.remove('hidden'); renderMonthGrid(); }
    function renderMonthGrid() { app.monthGrid.innerHTML = ''; app.pickerYearDisplay.textContent = pickerYear; var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; for (var i = 0; i < 12; i++) { var monthBtn = document.createElement('button'); monthBtn.textContent = monthNames[i]; monthBtn.className = 'month-picker-btn'; if (i === currentDate.getMonth() && pickerYear === currentDate.getFullYear()) { monthBtn.classList.add('active'); } monthBtn.addEventListener('click', (function(monthIndex) { return function() { currentDate.setFullYear(pickerYear); currentDate.setMonth(monthIndex); renderCalendar(); app.monthPickerModal.classList.add('hidden'); }; })(i)); app.monthGrid.appendChild(monthBtn); } }

    function getPeriodStartDates() {
        var cycleStarts = [];
        // Filter only days with flow
        var flowDays = periodData.periods.filter(p => p.flow).sort((a,b) => a.date.localeCompare(b.date));
        if (flowDays.length === 0) return [];
        cycleStarts.push(flowDays[0].date);
        for (var i = 1; i < flowDays.length; i++) {
            var prevDate = fromISODateString(flowDays[i - 1].date);
            var currDate = fromISODateString(flowDays[i].date);
            var diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            if (diffDays > 1) cycleStarts.push(flowDays[i].date);
        }
        return cycleStarts.filter(function(value, index, self) { return self.indexOf(value) === index; });
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
                if (isPeriodDay(nextDayStr)) {
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
        // Logic: If selected date is part of a period, open modal for that period.
        // If not, open modal for that single date.
        // Check if date has flow or is in period block
        if (isPeriodDay(dateStr)) {
            var blocks = getPeriodBlocks(getPeriodStartDates());
            return blocks.find(function(b) { return dateStr >= b.start && dateStr <= b.end; });
        }
        return null;
    }

    function calculateAverageCycleLength(startDates) { if (startDates.length < 2) return periodData.cycleLength || 28; var totalDiff = 0; for (var i = 1; i < startDates.length; i++) { totalDiff += (fromISODateString(startDates[i]) - fromISODateString(startDates[i-1])); } var avg = Math.round(totalDiff / (1000 * 60 * 60 * 24) / (startDates.length - 1)); return avg > 10 ? avg : (periodData.cycleLength || 28); }
    function calculateAveragePeriodLength() { var blocks = getPeriodBlocks(getPeriodStartDates()); if (blocks.length === 0) return 0; var totalLength = blocks.reduce(function(sum, b) { return sum + b.length; }, 0); return totalLength / blocks.length; }

    function calculateFlowDistribution() {
        var blocks = getPeriodBlocks(getPeriodStartDates());
        if (blocks.length === 0) return { light: 0, medium: 0, heavy: 0, totalDays: 0 };
        var counts = { light: 0, medium: 0, heavy: 0 };
        periodData.periods.filter(p=>p.flow).forEach(function(p) { if (counts.hasOwnProperty(p.flow)) { counts[p.flow]++; } });
        return { light: counts.light / blocks.length, medium: counts.medium / blocks.length, heavy: counts.heavy / blocks.length, totalDays: periodData.periods.filter(p=>p.flow).length };
    }

    function getNextPredictedStartDate(startDates, cycleLen) { if (startDates.length === 0) return null; var lastStartDate = fromISODateString(startDates[startDates.length - 1]); lastStartDate.setDate(lastStartDate.getDate() + cycleLen); return lastStartDate; }
    function getPredictedDates() { var nextStartDate = getNextPredictedStartDate(getPeriodStartDates(), periodData.cycleLength); if (!nextStartDate) return []; var dates = []; var avgPeriodLength = Math.round(calculateAveragePeriodLength()) || 5; for (var i = 0; i < avgPeriodLength; i++) { var date = new Date(nextStartDate); date.setDate(date.getDate() + i); dates.push(toISODateString(date)); } return dates; }
    function getNextFertileWindow() { var nextStartDate = getNextPredictedStartDate(getPeriodStartDates(), periodData.cycleLength); if (!nextStartDate) return null; var ovulationDay = new Date(nextStartDate); ovulationDay.setDate(ovulationDay.getDate() - 14); var windowStart = new Date(ovulationDay); windowStart.setDate(windowStart.getDate() - 5); return { start: toISODateString(windowStart), end: toISODateString(ovulationDay) }; }
    function getAllFertileDates() { var startDates = getPeriodStartDates(); var fertileDatesSet = []; function addWindow(cycleEndDate) { if (!cycleEndDate) return; var ovulationDay = new Date(cycleEndDate); ovulationDay.setDate(ovulationDay.getDate() - 14); for (var i = 5; i >= 0; i--) { var date = new Date(ovulationDay); date.setDate(date.getDate() - i); var dateStr = toISODateString(date); if (fertileDatesSet.indexOf(dateStr) === -1) { fertileDatesSet.push(dateStr); } } } if (startDates.length >= 1) { for (var i = 1; i < startDates.length; i++) { addWindow(fromISODateString(startDates[i])); } } addWindow(getNextPredictedStartDate(startDates, periodData.cycleLength)); return fertileDatesSet; }
    function showLogPeriodModal(start, end) { app.startDateInput.value = start; app.endDateInput.value = end; updateDailyFlowSelectors(); app.logModal.classList.remove('hidden'); }

    function updateDailyFlowSelectors() {
        app.dailyFlowContainer.innerHTML = '';
        var start = fromISODateString(app.startDateInput.value);
        var end = fromISODateString(app.endDateInput.value);
        if (!app.startDateInput.value || !app.endDateInput.value || start > end) return;

        var current = new Date(start);
        while(current <= end) {
            var dayStr = toISODateString(current);
            var log = getLog(dayStr) || {};
            var flow = log.flow || null;
            var mood = log.mood || '';
            var symptoms = log.symptoms || [];

            var dayEl = document.createElement('div');
            dayEl.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-2 border border-gray-200 dark:border-gray-600';
            dayEl.dataset.date = dayStr;

            var header = `
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-gray-700 dark:text-gray-200">${current.toLocaleDateString('default', {weekday: 'short', month: 'short', day: 'numeric'})}</span>
                    <button data-action="delete" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
                </div>`;

            var flowBtns = `
                <div class="mb-2">
                    <label class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Flow</label>
                    <div class="flex gap-2 mt-1">
                        <button data-flow="light" class="px-3 py-1 text-xs rounded transition-colors ${flow === 'light' ? 'flow-light' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-200'}">Light</button>
                        <button data-flow="medium" class="px-3 py-1 text-xs rounded transition-colors ${flow === 'medium' ? 'flow-medium' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-200'}">Medium</button>
                        <button data-flow="heavy" class="px-3 py-1 text-xs rounded transition-colors ${flow === 'heavy' ? 'flow-heavy' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-200'}">Heavy</button>
                    </div>
                </div>`;

            var moods = ['Happy', 'Sad', 'Anxious', 'Irritable', 'Energetic', 'Tired', 'Neutral'];
            var moodOptions = moods.map(m => `<option value="${m}" ${mood === m ? 'selected' : ''}>${m}</option>`).join('');
            var moodSelect = `
                <div class="mb-2">
                     <label class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Mood</label>
                     <select data-type="mood" class="w-full mt-1 p-2 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-700 dark:text-gray-200">
                        <option value="">Select Mood</option>
                        ${moodOptions}
                     </select>
                </div>`;

            var symptomList = ['Cramps', 'Headache', 'Bloating', 'Acne', 'Backache', 'Nausea', 'Tender Breasts', 'Insomnia'];
            var symptomChecks = symptomList.map(s => {
                const checked = symptoms.includes(s) ? 'checked' : '';
                return `<label class="inline-flex items-center bg-white dark:bg-gray-600 px-2 py-1 rounded border border-gray-200 dark:border-gray-500 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-500">
                    <input type="checkbox" value="${s}" ${checked} class="form-checkbox h-3 w-3 text-pink-500 rounded border-gray-300 mr-1">
                    <span class="text-gray-700 dark:text-gray-200">${s}</span>
                </label>`;
            }).join('');

            var symptomsDiv = `
                <div>
                     <label class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Symptoms</label>
                     <div class="flex flex-wrap gap-2 mt-1" data-type="symptoms">
                        ${symptomChecks}
                     </div>
                </div>`;

            dayEl.innerHTML = header + flowBtns + moodSelect + symptomsDiv;
            app.dailyFlowContainer.appendChild(dayEl);
            current.setDate(current.getDate() + 1);
        }
    }

    function showConfirm(title, message, options) { app.confirmTitle.textContent = title; app.confirmMessage.textContent = message; app.confirmOptions.innerHTML = ''; options.forEach(function(option) { var btn = document.createElement('button'); btn.textContent = option.text; var style = option.style || 'main-gradient-box'; if (style === 'cancel') { btn.className = 'w-full bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300'; } else if (style === 'bg-red-600') { btn.className = 'w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-red-700 transition-colors'; } else { btn.className = 'w-full text-white font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 transition-opacity ' + style; } btn.onclick = function() { if (option.action) option.action(); app.confirmModal.classList.add('hidden'); }; app.confirmOptions.appendChild(btn); }); app.confirmModal.classList.remove('hidden'); }

    app.tabButtons.forEach(function(btn) { btn.addEventListener('click', function() { switchTab(btn.dataset.tab); }); });
    app.prevBtn.addEventListener('click', function() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    app.nextBtn.addEventListener('click', function() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    app.monthYear.addEventListener('click', openMonthPicker);
    app.prevYearBtn.addEventListener('click', function() { pickerYear--; renderMonthGrid(); });
    app.nextYearBtn.addEventListener('click', function() { pickerYear++; renderMonthGrid(); });
    app.closeMonthPickerBtn.addEventListener('click', function() { app.monthPickerModal.classList.add('hidden'); });
    app.logPeriodBtn.addEventListener('click', function() { var today = toISODateString(new Date()); showLogPeriodModal(today, today); });
    app.closeWelcomeBtn.addEventListener('click', function() { app.welcomeModal.classList.add('hidden'); });
    app.showAnalysisBtn.addEventListener('click', function() { app.detailedAnalysis.classList.toggle('hidden'); if (app.detailedAnalysis.classList.contains('hidden')) { app.analysisArrow.textContent = '+'; } else { app.analysisArrow.textContent = '−'; } });
    app.startDateInput.addEventListener('change', updateDailyFlowSelectors); app.endDateInput.addEventListener('change', updateDailyFlowSelectors);

    app.dailyFlowContainer.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            var button = e.target.closest('button');
            if (button.dataset.action === 'delete') {
                var row = button.closest('[data-date]');
                row.querySelectorAll('button[data-flow]').forEach(b => {
                     b.classList.remove('flow-light', 'flow-medium', 'flow-heavy');
                     b.classList.add('bg-gray-200', 'dark:bg-gray-600', 'dark:text-gray-200');
                });
                row.querySelector('select').value = "";
                row.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
            } else if (button.dataset.flow) {
                var buttons = button.parentElement.querySelectorAll('button[data-flow]');
                buttons.forEach(function(b) {
                    b.classList.remove('flow-light', 'flow-medium', 'flow-heavy');
                    b.classList.add('bg-gray-200', 'dark:bg-gray-600', 'dark:text-gray-200');
                });
                button.classList.remove('bg-gray-200', 'dark:bg-gray-600', 'dark:text-gray-200');
                button.classList.add('flow-' + button.dataset.flow);
            }
        }
    });

    app.saveLogBtn.addEventListener('click', function() {
        var start = app.startDateInput.value;
        var end = app.endDateInput.value;
        if (!start || !end || fromISODateString(start) > fromISODateString(end)) { showConfirm("Invalid Dates", "Please ensure the start date is not after the end date.", [{text: "OK"}]); return; }

        periodData.periods = periodData.periods.filter(function(p) { return p.date < start || p.date > end; });

        var rows = app.dailyFlowContainer.querySelectorAll('[data-date]');
        rows.forEach(function(row) {
            var date = row.dataset.date;

            var flow = null;
            var activeFlowBtn = Array.from(row.querySelectorAll('button[data-flow]')).find(b => !b.classList.contains('bg-gray-200') && !b.classList.contains('dark:bg-gray-600'));
            if (activeFlowBtn) flow = activeFlowBtn.dataset.flow;

            var moodSelect = row.querySelector('select[data-type="mood"]');
            var mood = moodSelect.value || null;

            var symptomChecks = row.querySelectorAll('input[type="checkbox"]:checked');
            var symptoms = Array.from(symptomChecks).map(c => c.value);

            if (flow || mood || (symptoms && symptoms.length > 0)) {
                periodData.periods.push({
                    date: date,
                    flow: flow,
                    mood: mood,
                    symptoms: symptoms
                });
            }
        });
        saveData();
        app.logModal.classList.add('hidden');
    });

    app.cancelLogBtn.addEventListener('click', function() { app.logModal.classList.add('hidden'); });
    app.saveCycleOverrideBtn.addEventListener('click', function() { var val = parseInt(app.cycleOverrideInput.value); if (val > 10) { periodData.cycleLength = val; saveData(); showConfirm("Success", "Cycle length has been updated.", [{text: "OK"}]); } else { showConfirm("Invalid Input", "Please enter a cycle length greater than 10 days.", [{text: "OK"}]); } });
    app.recalculateBtn.addEventListener('click', function() { var avg = calculateAverageCycleLength(getPeriodStartDates()); periodData.cycleLength = avg; app.cycleOverrideInput.value = avg; saveData(); showConfirm("Success", "Cycle length has been recalculated to " + avg + " days.", [{text: "OK"}]); });
    app.exportBtn.addEventListener('click', function() { var dataStr = JSON.stringify(periodData, null, 2); var blob = new Blob([dataStr], {type: "application/json"}); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'pinkdays_backup_' + new Date().toISOString().split('T')[0] + '.json'; document.body.appendChild(a); a.click(); setTimeout(function() { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 500); });
    app.importBtn.addEventListener('click', function() { app.uploadInput.click(); });
    app.uploadInput.addEventListener('change', function(e) { var file = e.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function(event) { try { var uploadedData = JSON.parse(event.target.result); if (!uploadedData.periods || !uploadedData.hasOwnProperty('cycleLength')) { throw new Error("Invalid file format"); } var newPeriods = {}; periodData.periods.forEach(function(p) { newPeriods[p.date] = p; }); uploadedData.periods.forEach(function(p) { newPeriods[p.date] = p; }); periodData.periods = Object.values ? Object.values(newPeriods) : Object.keys(newPeriods).map(function(key) { return newPeriods[key]; }); periodData.cycleLength = uploadedData.cycleLength; saveData(); showConfirm("Success", "Data has been merged.", [{text: "OK"}]); } catch (err) { showConfirm("Upload Error", "The selected file is not a valid PinkDays backup.", [{text: "OK"}]); } }; reader.readAsText(file); e.target.value = ''; });
    app.resetBtn.addEventListener('click', function() { showConfirm("Reset All Data?", "This action cannot be undone and will delete all your cycle history.", [ { text: "Cancel", style: 'cancel' }, { text: "Yes, Reset", action: function() { if (isOfflineMode) localStorage.removeItem('pinkDaysData'); periodData = { periods: [], cycleLength: 28 }; saveData(); }, style: 'bg-red-600' } ]); });

    // Initialize the app on load
    if (localStorage.getItem('pinkDaysDarkMode') === 'true') {
        document.body.classList.add('dark');
        updateDarkModeToggleUI(true);
    }
    app.darkModeToggle.addEventListener('click', toggleDarkMode);

    initializeApp();
});
