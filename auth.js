// This file contains all authentication-related functions.
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    signInAnonymously,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth, initialAuthToken } from './firebase-config.js';

// Import UI helper functions from main.js
import {
    showMessage,
    setButtonLoadingState,
    showLoginView,
    showAppView,
    updateAllUI,
    startFirestoreSync,
    stopFirestoreSync,
    migrateDataToFirestore
} from './main.js';

/**
 * Initializes the Firebase authentication listener.
 * Checks for a logged-in user, handles anonymous sign-in, and manages offline mode.
 */
export function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('sessionMode', 'online');
            const offlineData = localStorage.getItem('pinkDaysData');
            if (offlineData) {
                await migrateDataToFirestore(user.uid, JSON.parse(offlineData));
                localStorage.removeItem('pinkDaysData');
                showMessage("Local data merged with your account.", 'success');
            }
            showAppView();
            updateAllUI();
            startFirestoreSync();
            document.getElementById('user-email-display').textContent = user.email || 'Anonymous';
        } else {
            const sessionMode = localStorage.getItem('sessionMode');
            stopFirestoreSync();
            if (sessionMode === 'offline') {
                showAppView();
                updateAllUI();
            } else {
                showLoginView();
            }
        }
    });

    if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
            console.error("Custom token sign-in failed:", error);
            signInAnonymously(auth);
        });
    } else {
        signInAnonymously(auth);
    }
}

/**
 * Handles email and password sign-up.
 * @param {string} email
 * @param {string} password
 */
export async function signUpWithEmail(email, password) {
    const button = document.getElementById('email-signup-btn');
    if (!email || password.length < 6) {
        return showMessage("Email and a password of at least 6 characters are required.", 'error');
    }
    setButtonLoadingState(button, true, 'Sign Up');
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Sign up successful! Welcome to PinkDays.", 'success');
    } catch (error) {
        showMessage(`Sign-up failed: ${error.message}`, 'error');
    } finally {
        setButtonLoadingState(button, false, 'Sign Up');
    }
}

/**
 * Handles email and password sign-in.
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
    const button = document.getElementById('email-signin-btn');
    if (!email || !password) {
        return showMessage("Email and password are required.", 'error');
    }
    setButtonLoadingState(button, true, 'Sign In');
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("Sign in successful! Welcome back.", 'success');
    } catch (error) {
        showMessage(`Sign-in failed: ${error.message}`, 'error');
    } finally {
        setButtonLoadingState(button, false, 'Sign In');
    }
}

/**
 * Sends a password reset email.
 * @param {string} email
 */
export async function resetPassword(email) {
    if (!email) {
        return showMessage("Please enter your email address.", 'info');
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Check your inbox.", 'success');
    } catch (error) {
        showMessage(`Error sending reset email: ${error.message}`, 'error');
    }
}

/**
 * Handles Google sign-in using a popup.
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        showMessage("Google sign-in successful!", 'success');
    } catch (error) {
        showMessage(`Google sign-in failed: ${error.message}`, 'error');
    }
}

/**
 * Handles user sign-out.
 */
export async function appSignOut() {
    try {
        await signOut(auth);
        showMessage("You have been signed out.", 'info');
    } catch (error) {
        showMessage(`Sign-out failed: ${error.message}`, 'error');
    }
}
