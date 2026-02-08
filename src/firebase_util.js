import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

await addDoc(collection(db, "records"), {
  title: "My first record",
  updatedAt: new Date()
});



const snapshot = await getDocs(collection(db, "records"));
const data = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));


import { doc, updateDoc } from "firebase/firestore";

await updateDoc(doc(db, "records", recordId), {
  title: "Updated title"
});
