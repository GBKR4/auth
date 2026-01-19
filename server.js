import app from "./src/app.js";
import express from "express";
import { initializeDatabase } from './src/database/init.js';
import { configDotenv } from "dotenv";

const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use('/', router);

await initializeDatabase();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})

