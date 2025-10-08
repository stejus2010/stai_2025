// firebase.js
  const firebaseConfig = {
    apiKey: "AIzaSyAMpv1EQCg-W7Fr_MXyfmLlO5zAGLAWXMo",
    authDomain: "stai-437917.firebaseapp.com",
    projectId: "stai-437917",
    storageBucket: "stai-437917.firebasestorage.app",
    messagingSenderId: "481645199693",
    appId: "1:481645199693:web:8f522c13003be9c4843704",
    measurementId: "G-RL21GL8Y0L"
  };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // optional
