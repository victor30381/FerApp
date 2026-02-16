import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBtVRuViKyY-HuStWSroA-2dDOOnwoVINc",
    authDomain: "ferapp-9a4eb.firebaseapp.com",
    projectId: "ferapp-9a4eb",
    storageBucket: "ferapp-9a4eb.firebasestorage.app",
    messagingSenderId: "392403129654",
    appId: "1:392403129654:web:3ffacefd56809fdbb54f97",
    measurementId: "G-W2LZSLNP59"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { db, auth, googleProvider, analytics };
