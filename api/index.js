import express from 'express';
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
} from 'firebase/firestore';
import cors from 'cors';

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

// Create Express server
const server = express();
server.use(cors());
server.use(express.json());

// API Endpoint: Fetch board names and their product names
server.post('/fetch-boards', async (req, res) => {
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
                
                const productId = productData.productId || "Unknown Product ID";
                const title = productData.title || "Unnamed Product";
                const descriptions = productData.descriptions || [];
                const images = productData.images || [];
                const status = productData.status || "Unknown Status";
                const videoLinks = productData.videoLinks || [];
                const voiceRecordings = productData.voiceRecordings || [];
        
                productDetails.push({
                    productId,
                    title,
                    descriptions,
                    images,
                    status,
                    videoLinks,
                    voiceRecordings
                });
            });

            response.push({
                boardName,
                products: productDetails,
            });
        }

        res.status(200).json({ data: response });
    } catch (error) {
        console.error("Error fetching boards and products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

server.post('/save-product', async (req, res) => {
    const { productId, ownerId, linkType, savedLinks } = req.body;
  
    console.log("Received data:", req.body);
  
    if (!productId || !ownerId || !linkType || !savedLinks || savedLinks.length === 0) {
      return res.status(400).json({ error: "All fields (productId, ownerId, linkType, savedLinks) are required." });
    }
  
    try {
      const productsCollection = collection(db, 'products');
      const productSnapshot = await getDocs(query(productsCollection, where('productId', '==', productId)));
  
      if (!productSnapshot.empty) {
        const productDoc = productSnapshot.docs[0];
        const productDocRef = doc(db, 'products', productDoc.id);
  
        const existingData = productDoc.data();
  
        for (const link of savedLinks) {
          switch (link.type) {
            case 'video-link':
                const existingVideoLinks = Array.isArray(existingData.videoLinks) ? existingData.videoLinks : [];
                if (!existingVideoLinks.includes(link.url)) {
                    existingVideoLinks.push(link.url);
                    await updateDoc(productDocRef, { videoLinks: existingVideoLinks, updatedAt: new Date() });
                }
                break;
            case 'photo-link':
              const existingImages = existingData.images || [];
              if (!existingImages.includes(link.url)) {
                existingImages.push(link.url);
                await updateDoc(productDocRef, { images: existingImages, updatedAt: new Date() });
              }
              break;
            case 'capture-page-link':
              const pageCaptures = existingData.pageCaptures || {};
              if (!pageCaptures[link.url]) {
                pageCaptures[link.url] = {
                  url: link.url,
                  title: link.type,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await updateDoc(productDocRef, { pageCaptures, updatedAt: new Date() });
              }
              break;
            case 'aliexpress-link':
            case 'alibaba-link':
            case '1688-link':
            case 'amazon-link':
              const marketplaceLinks = existingData.marketplaceLinks || {};
              const marketplace = link.type.replace('-link', '');
              if (!marketplaceLinks[link.url]) {
                marketplaceLinks[link.url] = {
                  url: link.url,
                  marketplace: marketplace || "marketplace",
                  title: link.type,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await updateDoc(productDocRef, { marketplaceLinks, updatedAt: new Date() });
              }
              break;
            default:
              console.log(`Unhandled link type: ${link.type}`);
          }
        }
  
        return res.status(200).json({ message: "Links updated successfully" });
      } else {
        const newProductData = {
          productId,
          ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
          videoLinks: [],
          images: [],
          pageCaptures: {},
          marketplaceLinks: {},
        };
  
        for (const link of savedLinks) {
          switch (link.type) {
            case 'video-link':
              newProductData.videoLinks.push(link.url);
              break;
            case 'photo-link':
              newProductData.images.push(link.url);
              break;
            case 'capture-page-link':
              newProductData.pageCaptures[link.url] = {
                url: link.url,
                title: link.type,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              break;
            case 'aliexpress-link':
            case 'alibaba-link':
            case '1688-link':
            case 'amazon-link':
              const marketplace = link.type.replace('-link', '');
              newProductData.marketplaceLinks[link.url] = {
                url: link.url,
                title: link.type,
                marketplace: marketplace,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              break;
            default:
              console.log(`Unhandled link type: ${link.type}`);
          }
        }
  
        await addDoc(productsCollection, newProductData);
        return res.status(200).json({ message: "Product created successfully with links" });
      }
    } catch (error) {
      console.error("Error saving product:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
});

export function handler(req, res) {
  return server(req, res); // Use the Express app to handle the request
}
