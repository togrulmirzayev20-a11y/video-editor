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

app.post("/api/render", (req, res) => {
  const { clips } = req.body;
  if (!clips || clips.length === 0) return res.status(400).json({ error: "Klip yoxdur" });

  const jobId = crypto.randomUUID();
  const outputFileName = `video_${jobId}.mp4`;
  const outputPath = path.join(__dirname, outputFileName);

  jobs[jobId] = { status: "processing", progress: 0, outputUrl: null };

  res.json({ message: "Render başladı", jobId, statusUrl: `https://${req.headers.host}/api/status/${jobId}` });

  // 🚀 GÜCLƏNDİRİLMİŞ FFMPEG KOMANDASI
  ffmpeg(clips[0].fileId)
    .inputOptions([
        "-reconnect 1",
        "-reconnect_at_eof 1",
        "-reconnect_streamed 1",
        "-reconnect_delay_max 5",
        "-protocol_whitelist file,http,https,tcp,tls,crypto",
        "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ])
    .outputOptions([
      "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
      "-c:v libx264",
      "-preset superfast", // RAM üçün ən yüngül rejim
      "-crf 28",           // Fayl ölçüsünü kiçildir ki, server boğulmasın
      "-threads 1",
      "-pix_fmt yuv420p",  // TikTok/YouTube üçün tam uyğunluq
      "-c:a aac",          // Səsi daha stabil formata salır
      "-movflags +faststart" // Videonun linkdə tez açılması üçün
    ])
    .on("progress", (progress) => {
      // Əgər progress.percent yoxdursa, vaxta görə hesabla
      jobs[jobId].progress = progress.percent ? Math.round(progress.percent) : "Video emal edilir...";
      console.log(`Render statusu: ${jobs[jobId].progress}`);
    })
    .on("end", () => {
      jobs[jobId].status = "completed";
      jobs[jobId].progress = 100;
      jobs[jobId].outputUrl = `https://${req.headers.host}/${outputFileName}`;
      console.log("✅ UĞUR:", jobs[jobId].outputUrl);
    })
    .on("error", (err) => {
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message;
      console.log("❌ XƏTA:", err.message);
    })
    .save(outputPath);
});

app.get("/api/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  job ? res.json(job) : res.status(404).json({ error: "İş tapılmadı" });
});

app.listen(PORT, () => console.log("Server aktiv: " + PORT));
