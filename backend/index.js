const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const https = require("https");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "VideoEditor API", ffmpeg: "var" });
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ── ANA ENDPOINT ─────────────────────────────────────────────
// n8n buraya göndərir:
//   - videoUrl  → Form field (mətn)
//   - audioFile → Binary fayl
app.post("/api/render", upload.single("audioFile"), async (req, res) => {
  const videoUrl = req.body.videoUrl;
  const audioFile = req.file;

  if (!videoUrl) {
    return res.status(400).json({ error: "videoUrl lazımdır" });
  }
  if (!audioFile) {
    return res.status(400).json({ error: "audioFile lazımdır" });
  }

  const id = Date.now();
  const videoPath = `uploads/video-${id}.mp4`;
  const audioPath = audioFile.path;
  const outputPath = `outputs/output-${id}.mp4`;

  try {
    console.log("Video yüklənir:", videoUrl);
    await downloadFile(videoUrl, videoPath);
    console.log("Video yükləndi, FFmpeg başlayır...");

    const cmd = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}" -y`;

    exec(cmd, (err, stdout, stderr) => {
      fs.unlink(videoPath, () => {});
      fs.unlink(audioPath, () => {});

      if (err) {
        console.error("FFmpeg xəta:", stderr);
        return res.status(500).json({ error: "Render uğursuz", detail: stderr });
      }

      console.log("Render tamamlandı!");
      res.download(outputPath, `output-${id}.mp4`, () => {
        fs.unlink(outputPath, () => {});
      });
    });

  } catch (err) {
    fs.unlink(videoPath, () => {});
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server port ${PORT}-da işləyir`));
