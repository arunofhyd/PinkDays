import { auth, db } from './firebase-config.js';
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initAuth, signUpWithEmail, signInWithEmail, signInWithGoogle, appSignOut, resetPassword } from './auth.js';

// --- DOM Elements ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const currentMonthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');

let currentUser = null;
let currentMonth = new Date();
let periodData = {};
let unsubscribeFromData = null;

// --- UI Functions ---
export function showLoginView() {
    appView.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        appView.classList.add('hidden');
        loginView.classList.remove('hidden');
        loginView.classList.remove('opacity-0', 'scale-95');
    }, 300);
}

export function showAppView() {
    loginView.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        appView.classList.remove('opacity-0', 'scale-95');
    }, 300);
}

export function handleUserLogin(user) {
    currentUser = user;
    if (unsubscribeFromData) unsubscribeFromData();
    
    const userDocRef = doc(db, "users", user.uid);
    unsubscribeFromData = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            periodData = doc.data().periods || {};
        } else {
            // Create a document for a new user
            setDoc(userDocRef, { periods: {} });
        }
        renderCalendar();
    });
    showAppView();
}

// --- Calendar Logic ---
function renderCalendar() {
    calendarGrid.innerHTML = ''; // Clear previous calendar
    currentMonthDisplay.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'text-center font-bold text-pink-400';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateKey = getYYYYMMDD(date);
        
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';
        dayContent.textContent = day;
        
        if (date.toDateString() === today.toDateString()) {
            dayCell.classList.add('is-today');
        }

        if (periodData[dateKey]) {
            dayCell.classList.add('period-day');
            if (periodData[dateKey].isStart) dayCell.classList.add('period-start');
            if (periodData[dateKey].isEnd) dayCell.classList.add('period-end');
        }
        
        dayCell.appendChild(dayContent);
        dayCell.addEventListener('click', () => togglePeriodDay(dateKey));
        calendarGrid.appendChild(dayCell);
    }
}

// --- Data Functions ---
async function saveData() {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
        await setDoc(userDocRef, { periods: periodData });
        showMessage("Data saved!", 'success');
    } catch (error) {
        console.error("Error saving data:", error);
        showMessage("Could not save data.", 'error');
    }
}

function togglePeriodDay(dateKey) {
    if (periodData[dateKey]) {
        // If the day is already marked, unmark it and all subsequent days in that cycle
        const cycleStartDate = periodData[dateKey].cycleStart;
        for (const key in periodData) {
            if (periodData[key].cycleStart === cycleStartDate) {
                delete periodData[key];
            }
        }
    } else {
        // Mark a new period day
        const date = new Date(dateKey + 'T00:00:00');
        const prevDateKey = getYYYYMMDD(new Date(date.setDate(date.getDate() - 1)));
        
        if (periodData[prevDateKey] && !periodData[prevDateKey].isEnd) {
            // Continue an existing cycle
            periodData[dateKey] = { cycleStart: periodData[prevDateKey].cycleStart };
        } else {
            // Start a new cycle
            periodData[dateKey] = { isStart: true, cycleStart: dateKey };
        }
        
        // Check if the previous day should now be marked as an end day
        const nextDateKey = getYYYYMMDD(new Date(date.setDate(date.getDate() + 2)));
        if(periodData[prevDateKey] && !periodData[nextDateKey]){
             periodData[prevDateKey].isEnd = false; // It's no longer the end
        }
    }
    
    // Recalculate start and end days
    recalculateCycleBounds();
    saveData();
}

function recalculateCycleBounds() {
    const allDates = Object.keys(periodData).sort();
    const cycles = {};

    // Group dates by cycle
    allDates.forEach(dateKey => {
        const cycleStart = periodData[dateKey].cycleStart;
        if (!cycles[cycleStart]) {
            cycles[cycleStart] = [];
        }
        cycles[cycleStart].push(dateKey);
    });

    // Reset all start/end flags
    for (const key in periodData) {
        delete periodData[key].isStart;
        delete periodData[key].isEnd;
    }

    // Set new start/end flags
    for (const cycleStart in cycles) {
        const datesInCycle = cycles[cycleStart].sort();
        periodData[datesInCycle[0]].isStart = true;
        periodData[datesInCycle[datesInCycle.length - 1]].isEnd = true;
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    
    document.getElementById('email-signup-btn').addEventListener('click', () => signUpWithEmail(emailInput.value, passwordInput.value));
    document.getElementById('email-signin-btn').addEventListener('click', () => signInWithEmail(emailInput.value, passwordInput.value));
    document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
    document.getElementById('sign-out-btn').addEventListener('click', appSignOut);
    document.getElementById('forgot-password-btn').addEventListener('click', () => resetPassword(emailInput.value));

    document.getElementById('prev-month-btn').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('next-month-btn').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    const passwordToggleBtn = document.getElementById('password-toggle-btn');
    const passwordToggleIcon = document.getElementById('password-toggle-icon');
    passwordToggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordToggleIcon.classList.toggle('fa-eye-slash', !isPassword);
        passwordToggleIcon.classList.toggle('fa-eye', isPassword);
    });
}

// --- Utility Functions ---
function getYYYYMMDD(date) {
    return date.toISOString().split('T')[0];
}

export function showMessage(msg, type = 'info') {
    const messageDisplay = document.getElementById('message-display');
    const messageText = document.getElementById('message-text');
    messageText.textContent = msg;
    messageDisplay.className = 'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-md transition-opacity duration-300';
    if (type === 'error') {
        messageDisplay.classList.add('bg-red-100', 'border', 'border-red-400', 'text-red-700');
    } else {
        messageDisplay.classList.add('bg-green-100', 'border', 'border-green-400', 'text-green-700');
    }
    messageDisplay.classList.add('show');
    setTimeout(() => messageDisplay.classList.remove('show'), 3000);
}

export function setButtonLoadingState(button, isLoading, originalText) {
    const spinner = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalContent = originalText;
        button.innerHTML = `${spinner}<span>Processing...</span>`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalContent;
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initAuth();
});
