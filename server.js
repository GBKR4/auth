import app from "./src/app.js";
import express from "express";


const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})