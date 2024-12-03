import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAUillguCiDkazyDeTrb_Kszu4yCYGx-Bs",
    authDomain: "cod-app-c801c.firebaseapp.com",
    projectId: "cod-app-c801c",
    storageBucket: "cod-app-c801c.appspot.com",
    messagingSenderId: "316119589314",
    appId: "1:316119589314:web:025e2577f9f998b6aa765b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { ownerId } = req.body;
    if (!ownerId) {
        return res.status(400).json({ error: "ownerId is required" });
    }

    try {
        const boardsCollection = collection(db, 'boards');
        const boardsQuery = query(boardsCollection, where('ownerId', '==', ownerId));
        const boardsSnapshot = await getDocs(boardsQuery);

        if (boardsSnapshot.empty) {
            return res.status(404).json({ message: "No boards found for this owner ID." });
        }

        const response = [];
        for (const boardDoc of boardsSnapshot.docs) {
            const boardData = boardDoc.data();
            const boardId = boardDoc.id;
            const boardName = boardData.name || "Unknown";

            const productsCollection = collection(db, 'products');
            const productsQuery = query(productsCollection, where('boardId', '==', boardId));
            const productsSnapshot = await getDocs(productsQuery);

            const productDetails = [];
            productsSnapshot.forEach((productDoc) => {
                const productData = productDoc.data();
                productDetails.push({
                    productId: productData.productId || "Unknown Product ID",
                    title: productData.title || "Unnamed Product",
                    descriptions: productData.descriptions || [],
                    images: productData.images || [],
                    status: productData.status || "Unknown Status",
                    videoLinks: productData.videoLinks || [],
                    voiceRecordings: productData.voiceRecordings || [],
                });
            });

            response.push({ boardName, products: productDetails });
        }

        res.status(200).json({ data: response });
    } catch (error) {
        console.error("Error fetching boards and products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
