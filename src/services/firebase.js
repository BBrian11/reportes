import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZcj7AOQoXHHn1vDiyoCQbDIQRMfvhOlA",
  authDomain: "reportesg3t.firebaseapp.com",
  projectId: "reportesg3t",
  storageBucket: "reportesg3t.appspot.com",
  messagingSenderId: "571918948751",
  appId: "1:571918948751:web:055d012f4e1f3f8de5d3fa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
