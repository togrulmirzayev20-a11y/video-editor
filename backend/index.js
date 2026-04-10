const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

const jobs = {};

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.json({ message: "VideoEditor API işləyir" }));

app.post("/api/render", (req, res) => {
  const { clips } = req.body;
  if (!clips || clips.length === 0) return res.status(400).json({ error: "Klip yoxdur" });

  const jobId = crypto.randomUUID();
  const outputFileName = `video_${jobId}.mp4`;
  const outputPath = path.join(__dirname, outputFileName);

  jobs[jobId] = { status: "processing", progress: 0, outputUrl: null };

  res.json({ message: "Render başladı", jobId, statusUrl: `https://${req.headers.host}/api/status/${jobId}` });

  // 🎬 ƏSL FFMPEG İŞƏ DÜŞÜR
  ffmpeg(clips[0].fileId)
    // YENİ: Amazonun .m3u8 (Stream) linklərini oxumaq üçün xüsusi icazələr
    .inputOptions([
      "-protocol_whitelist file,http,https,tcp,tls,crypto" 
    ])
    .outputOptions([
      "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
      "-c:v libx264",       
      "-preset ultrafast",  
      "-threads 1",         
      "-c:a copy"           
    ])
    .on("progress", (progress) => {
      jobs[jobId].progress = Math.round(progress.percent || 0);
      console.log(`Render faizi: ${jobs[jobId].progress}%`);
    })
    .on("end", () => {
      jobs[jobId].status = "completed";
      jobs[jobId].progress = 100;
      jobs[jobId].outputUrl = `https://${req.headers.host}/${outputFileName}`;
      console.log("✅ Video hazır oldu:", jobs[jobId].outputUrl);
    })
    .on("error", (err) => {
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message;
      console.log("❌ Xəta:", err.message);
    })
    .save(outputPath);
});

app.get("/api/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  job ? res.json(job) : res.status(404).json({ error: "İş tapılmadı" });
});

app.listen(PORT, () => console.log("Server işləyir: " + PORT));
