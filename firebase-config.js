import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDEK9OgZ0PphoukTJb9uB1J_0de8Dtf0QA",
    authDomain: "pinkdaysaoh.firebaseapp.com",
    projectId: "pinkdaysaoh",
    storageBucket: "pinkdaysaoh.appspot.com",
    messagingSenderId: "16168022769",
    appId: "1:16168022769:web:a7a4daf40c7bf11b56af50"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
