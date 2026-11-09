const express = require("express");
require("dotenv").config();

const app = express();
const port = 3000;

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});