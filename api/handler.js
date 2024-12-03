import express from 'express';
import fetchBoards from './fetch-boards';
import saveProduct from './save-product';

const app = express();
app.use(express.json());

// Set up your routes
app.use('/api/fetch-boards', fetchBoards);
app.use('/api/save-product', saveProduct);

export default function handler(req, res) {
  return app(req, res); // Vercel's handler
}
