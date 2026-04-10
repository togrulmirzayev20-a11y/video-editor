const express = require("express");
const cors = require("cors");
const crypto = require("crypto"); // İş nömrələri (jobId) yaratmaq üçün
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// İşlərin statusunu yaddaşda saxlamaq üçün obyekt
const jobs = {};

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "VideoEditor API", version: "1.0.0" });
});

app.get("/", (req, res) => {
  res.json({ message: "VideoEditor API işləyir", endpoints: ["/health", "/api/render"] });
});

// 🚀 YENİ ƏLAVƏ: n8n-dən və ya saytdan məlumatı qəbul edən qapı
app.post("/api/render", (req, res) => {
  const { clips, aspectRatio, resolution, transitionDuration } = req.body;

  // n8n-in bizə nə göndərdiyini serverin loqlarında görmək üçün
  console.log("n8n-dən yeni sifariş gəldi! Detallar:", req.body);

  if (!clips || clips.length === 0) {
    return res.status(400).json({ error: "Heç bir klip tapılmadı" });
  }

  // Yeni bir iş (job) yaradırıq
  const jobId = crypto.randomUUID();
  jobs[jobId] = {
    status: "processing",
    progress: 0,
    outputUrl: null
  };

  // 🛠 SİMULYASİYA: Burada FFmpeg əvəzinə yalandan 10 saniyəlik render edirik
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    jobs[jobId].progress = progress;

    if (progress >= 100) {
      clearInterval(interval);
      jobs[jobId].status = "completed";
      // Test üçün hələlik bizə göndərilən o Amazon linkini hazır video kimi geri qaytarırıq
      jobs[jobId].outputUrl = clips[0].fileId; 
    }
  }, 1000); // Hər saniyə 10% artır

  // N8n-ə dərhal cavab qaytarırıq ki, xəta verməsin, "iş gedir" bilsin
  res.json({ 
    message: "Render başladı", 
    jobId: jobId, 
    statusUrl: `https://${req.headers.host}/api/status/${jobId}` 
  });
});

// 🚀 YENİ ƏLAVƏ: Frontend-in progress-i (faizi) yoxlaması üçün
app.get("/api/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: "İş tapılmadı" });
  }
  res.json(job);
});

app.listen(PORT, () => {
  console.log("Server port " + PORT + " da işləyir");
});
