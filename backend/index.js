const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/api/render", upload.single("audio"), (req, res) => {
  const videoUrl = req.query.videoUrl;
  const audioPath = req.file.path;
  const outputPath = `uploads/output-${Date.now()}.mp4`;

  console.log("Processing started: ", videoUrl);

  ffmpeg(videoUrl)
    .input(audioPath)
    .outputOptions([
      "-c:v copy",   // Videonu render etmə, sadəcə kopyala
      "-c:a aac",    // Səsi AAC formatına çevir
      "-map 0:v:0",  // Birinci girişdən (Video) görüntünü götür
      "-map 1:a:0",  // İkinci girişdən (Audio) səsi götür
      "-shortest"    // Hansı qısadırsa, orada dayandır
    ])
    .on("error", (err) => {
      console.error("FFmpeg Error: ", err.message);
      res.status(500).send("Video processing failed.");
    })
    .on("end", () => {
      console.log("Processing finished!");
      res.download(outputPath, () => {
        // Fayl göndərildikdən sonra təmizlik işləri
        fs.unlinkSync(audioPath);
        fs.unlinkSync(outputPath);
      });
    })
    .save(outputPath);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
