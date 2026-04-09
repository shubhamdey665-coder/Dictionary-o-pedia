import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config - Note: In production, use environment variables for sensitive data
const firebaseConfig = {
  apiKey: "AIzaSyD7XQDsD2hPODESWbw_RvJaycxDGjoOzk0",
  authDomain: "dictionary-o-pedia.firebaseapp.com",
  projectId: "dictionary-o-pedia",
  storageBucket: "dictionary-o-pedia.firebasestorage.app",
  messagingSenderId: "871250948146",
  appId: "1:871250948146:web:2b41b1c535f7e12d95cc2b",
  measurementId: "G-53239HPG41"
};

// Utility function to escape HTML and prevent XSS attacks
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentSearchedWord = "";
let gameScore = localStorage.getItem("gameScore") ? parseInt(localStorage.getItem("gameScore")) : 0;
let currentGameWord = "";

// AUTH
window.signUp = async function () {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const authMessage = document.getElementById("authMessage");

  if (!emailEl || !passwordEl || !authMessage) return;

  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();

  if (email === "" || password === "") {
    authMessage.innerText = "Please enter email and password.";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authMessage.innerText = "Signup successful";
    emailEl.value = "";
    passwordEl.value = "";
  } catch (error) {
    console.log("SIGNUP ERROR:", error.code, error.message);
    authMessage.innerText = error.message;
  }
};

window.logIn = async function () {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const authMessage = document.getElementById("authMessage");

  if (!emailEl || !passwordEl || !authMessage) return;

  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();

  if (email === "" || password === "") {
    authMessage.innerText = "Please enter email and password.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage.innerText = "Login successful";
    emailEl.value = "";
    passwordEl.value = "";
  } catch (error) {
    console.log("LOGIN ERROR:", error.code, error.message);
    authMessage.innerText = error.message;
  }
};

window.logOut = async function () {
  const authMessage = document.getElementById("authMessage");

  try {
    await signOut(auth);
    if (authMessage) authMessage.innerText = "Logged out successfully";
  } catch (error) {
    console.log("LOGOUT ERROR:", error.code, error.message);
    if (authMessage) authMessage.innerText = error.message;
  }
};

onAuthStateChanged(auth, (user) => {
  const userStatus = document.getElementById("userStatus");

  if (user) {
    currentUser = user;
    if (userStatus) userStatus.innerText = "Logged in as: " + user.email;

    if (document.getElementById("favoritesList")) {
      window.loadFavorites();
    }
  } else {
    currentUser = null;
    if (userStatus) userStatus.innerText = "Not logged in";

    const favoritesList = document.getElementById("favoritesList");
    if (favoritesList) favoritesList.innerHTML = "";
  }
});

// TRANSLATION
async function translateWord(text, targetLang) {
  try {
    if (targetLang === "en") return text;

    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
    );
    const data = await response.json();

    if (data?.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    return "Translation not available";
  } catch (error) {
    return "Translation not available";
  }
}

// DICTIONARY
window.searchWord = async function () {
  const searchBox = document.getElementById("searchBox");
  const resultBox = document.getElementById("result");
  const languageSelect = document.getElementById("languageSelect");

  if (!searchBox || !resultBox || !languageSelect) return;

  const input = searchBox.value.trim().toLowerCase();
  const selectedLang = languageSelect.value;

  if (input === "") {
    resultBox.innerHTML = "Please type a word.";
    return;
  }

  resultBox.innerHTML = "Searching...";

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
    
    if (!response.ok) {
      resultBox.innerHTML = "<p>Word not found.</p>";
      currentSearchedWord = "";
      return;
    }
    
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      resultBox.innerHTML = "<p>Word not found.</p>";
      currentSearchedWord = "";
      return;
    }

    const wordData = data[0];
    const phonetic = wordData.phonetic || "Not available";
    const partOfSpeech = wordData.meanings?.[0]?.partOfSpeech || "Not available";
    const definition =
      wordData.meanings?.[0]?.definitions?.[0]?.definition || "No definition available";
    const example =
      wordData.meanings?.[0]?.definitions?.[0]?.example || "No example available";

    let langCode = "en";
    if (selectedLang === "Hindi") langCode = "hi";
    if (selectedLang === "Bengali") langCode = "bn";

    const translated = await translateWord(definition, langCode);
    currentSearchedWord = wordData.word;

    // Escape all user-facing content to prevent XSS attacks
    resultBox.innerHTML = `
      <h2>${escapeHtml(wordData.word)}</h2>
      <p><b>Phonetic:</b> ${escapeHtml(phonetic)}</p>
      <p><span class="tag">${escapeHtml(partOfSpeech)}</span></p>
      <p><b>Meaning:</b> ${escapeHtml(definition)}</p>
      <p><b>Example:</b> ${escapeHtml(example)}</p>
      <p><b>${escapeHtml(selectedLang)} Meaning:</b> ${escapeHtml(translated)}</p>
    `;
  } catch (error) {
    console.log("SEARCH ERROR:", error);
    resultBox.innerHTML = "<p>Error loading meaning. Please try another word.</p>";
    currentSearchedWord = "";
  }
};

window.fillWord = function (word) {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  searchBox.value = word;
  window.searchWord();
};

// WORD OF THE DAY
const dailyWords = [
  { word: "serene", meaning: "calm and peaceful" },
  { word: "brilliant", meaning: "very smart or bright" },
  { word: "curious", meaning: "eager to know something" },
  { word: "inspire", meaning: "to motivate someone" },
  { word: "wisdom", meaning: "the ability to make good decisions" }
];

function showWordOfDay() {
  const wordOfDayEl = document.getElementById("wordOfDay");
  if (!wordOfDayEl) return;

  const dayIndex = new Date().getDate() % dailyWords.length;
  const todayWord = dailyWords[dayIndex];

  wordOfDayEl.innerHTML = `
    <h2>Word of the Day</h2>
    <p><b>${todayWord.word}</b> - ${todayWord.meaning}</p>
  `;
}

// FEEDBACK
window.submitFeedback = async function () {
  const feedbackTextEl = document.getElementById("feedbackText");
  const feedbackMsg = document.getElementById("feedbackMsg");

  if (!feedbackTextEl || !feedbackMsg) return;

  const feedbackText = feedbackTextEl.value.trim();

  if (!currentUser) {
    feedbackMsg.innerText = "Please log in first.";
    return;
  }

  if (feedbackText === "") {
    feedbackMsg.innerText = "Please write feedback first.";
    return;
  }

  try {
    await addDoc(collection(db, "feedback"), {
      userEmail: currentUser.email,
      userId: currentUser.uid,
      feedback: feedbackText,
      createdAt: new Date().toISOString()
    });

    feedbackMsg.innerText = "Feedback saved successfully";
    feedbackTextEl.value = "";
  } catch (error) {
    console.log("FEEDBACK ERROR:", error.code, error.message);
    feedbackMsg.innerText = "Error saving feedback";
  }
};

// FAVORITES
window.saveCurrentFavorite = async function () {
  if (!currentUser) {
    alert("Please log in first");
    return;
  }

  if (!currentSearchedWord) {
    alert("Search a word first");
    return;
  }

  try {
    await addDoc(collection(db, "favorites"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      word: currentSearchedWord,
      createdAt: new Date().toISOString()
    });

    alert("Favorite saved");
    window.loadFavorites();
  } catch (error) {
    console.log("SAVE FAVORITE ERROR:", error.code, error.message);
    alert("Error saving favorite");
  }
};

window.loadFavorites = async function () {
  const favoritesList = document.getElementById("favoritesList");
  if (!favoritesList) return;

  if (!currentUser) {
    favoritesList.innerHTML = "<li>Please log in to see favorites.</li>";
    return;
  }

  favoritesList.innerHTML = "<li>Loading...</li>";

  try {
    const q = query(
      collection(db, "favorites"),
      where("userId", "==", currentUser.uid)
    );

    const querySnapshot = await getDocs(q);

    favoritesList.innerHTML = "";

    if (querySnapshot.empty) {
      favoritesList.innerHTML = "<li>No favorite words found.</li>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      // Use textContent for safety instead of innerHTML
      li.textContent = escapeHtml(data.word) || "No word";
      favoritesList.appendChild(li);
    });
  } catch (error) {
    console.log("LOAD FAVORITES ERROR:", error.code, error.message);
    favoritesList.innerHTML = "<li>Error loading favorites.</li>";
  }
};

// GAME
const gameWords = [
  { word: "apple", hint: "A fruit" },
  { word: "code", hint: "Instructions for a computer" },
  { word: "learn", hint: "To gain knowledge" },
  { word: "dictionary", hint: "A tool for meanings" },
  { word: "science", hint: "Study of the natural world" }
];

function updateGameScore() {
  const scoreEl = document.getElementById("gameScore");
  if (scoreEl) {
    scoreEl.innerText = `Score: ${gameScore}`;
  }
}

window.startGame = function () {
  const hintEl = document.getElementById("gameHint");
  const msgEl = document.getElementById("gameMessage");
  const ansEl = document.getElementById("gameAnswer");
  const inputEl = document.getElementById("gameInput");

  if (!hintEl || !msgEl || !inputEl || !ansEl) return;

  const randomItem = gameWords[Math.floor(Math.random() * gameWords.length)];
  currentGameWord = randomItem.word;

  hintEl.innerText = "Hint: " + randomItem.hint;
  msgEl.innerText = "";
  ansEl.innerText = "";
  inputEl.value = "";
  updateGameScore();
};

window.checkGameAnswer = function () {
  const inputEl = document.getElementById("gameInput");
  const msgEl = document.getElementById("gameMessage");
  const ansEl = document.getElementById("gameAnswer");

  if (!inputEl || !msgEl || !ansEl) return;

  const answer = inputEl.value.trim().toLowerCase();

  if (!answer) {
    msgEl.innerText = "Type an answer first.";
    return;
  }

  if (answer === currentGameWord) {
    gameScore++;
    msgEl.innerText = "Correct!";
  } else {
    msgEl.innerText = "Wrong!";
  }

  ansEl.innerText = "Correct Answer: " + currentGameWord;
  // Save game score to localStorage for persistence
  localStorage.setItem("gameScore", gameScore);
  updateGameScore();
};

window.showAnswer = function () {
  const ansEl = document.getElementById("gameAnswer");
  if (!ansEl) return;

  ansEl.innerText = "Correct Answer: " + currentGameWord;
};

// PETALS
function createPetals() {
  const petalContainer = document.getElementById("petalContainer");
  if (!petalContainer) return;

  petalContainer.innerHTML = "";

  for (let i = 0; i < 25; i++) {
    const petal = document.createElement("div");
    petal.classList.add("petal");
    petal.style.left = Math.random() * 100 + "vw";
    petal.style.animationDuration = (5 + Math.random() * 8) + "s";
    petal.style.animationDelay = Math.random() * 5 + "s";
    petal.style.opacity = Math.random();
    petal.style.transform = `scale(${0.5 + Math.random()})`;
    petalContainer.appendChild(petal);
  }
}

function initEnterKeySearch() {
  const searchBoxEl = document.getElementById("searchBox");
  if (!searchBoxEl) return;

  searchBoxEl.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      window.searchWord();
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  createPetals();
  showWordOfDay();
  initEnterKeySearch();

  if (document.getElementById("gameHint")) {
    window.startGame();
  }
});