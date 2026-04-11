const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer"); // Fayl qəbul etmək üçün

const app = express();
const upload = multer({ dest: "uploads/" }); // Səsləri müvəqqəti bura yığacaq
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const jobs = {};

app.post("/api/render", upload.single("audio"), (req, res) => {
 const videoUrl = req.query.videoUrl || req.body.videoUrl;
  const audioFile = req.file; // n8n-dən gələn səs faylı

  if (!videoUrl) return res.status(400).json({ error: "Video linki yoxdur" });

  const jobId = crypto.randomUUID();
  const outputFileName = `final_${jobId}.mp4`;
  const outputPath = path.join(__dirname, outputFileName);

  jobs[jobId] = { status: "processing", progress: 0 };

  res.json({ jobId, statusUrl: `https://${req.headers.host}/api/status/${jobId}` });

  let command = ffmpeg(videoUrl)
    .inputOptions(["-reconnect 1", "-reconnect_streamed 1", "-reconnect_delay_max 5"]);

  if (audioFile) {
    command = command.input(audioFile.path);
  }

  command
 .outputOptions([
  "-c:v libx264", 
  "-preset ultrafast", // Ən sürətli və ən az RAM yeyən rejim
  "-crf 32",           // Keyfiyyəti bir az azaldırıq ki, yük düşməsin
  "-threads 1",        // Çox nüvə istifadə edib serveri dondurmasın
  "-map 0:v:0",
  audioFile ? "-map 1:a:0" : "-an",
  "-c:a aac", 
  "-shortest"
])
    .on("end", () => {
      jobs[jobId].status = "completed";
      jobs[jobId].outputUrl = `https://${req.headers.host}/${outputFileName}`;
    })
    .on("error", (err) => {
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message;
    })
    .save(outputPath);
});

app.get("/api/status/:jobId", (req, res) => {
  res.json(jobs[req.params.jobId] || { error: "Tapılmadı" });
});

app.listen(PORT, () => console.log("Server hazırdır!"));
