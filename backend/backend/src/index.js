const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "VideoEditor API", version: "1.0.0" });
});

app.get("/", (_req, res) => {
  res.json({ message: "VideoEditor API işləyir", endpoints: ["/health"] });
});

app.listen(PORT, () => {
  console.log("Server port " + PORT + " da işləyir");
});
