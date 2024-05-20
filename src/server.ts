import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const baseUrl = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

console.log(process.env);
const storage = multer.memoryStorage();

const upload = multer({ storage });

app.use((req, res, next) => {
  // console.log(req);
  next();
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Falha no upload do arquivo" });
  }

  const uploadPath = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
  }

  const filename =
    uuidv4() + "-" + Date.now() + path.extname(req.file.originalname);

  const filePath = path.join(uploadPath, filename);

  try {
    await sharp(req.file.buffer).jpeg({ quality: 100 }).toFile(filePath);

    res.json({
      message: "Upload e compressão bem-sucedidos",
      filename,
      filePath: baseUrl + `/file/` + filename,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao processar a imagem", error });
  }
});

app.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).json({ message: "Arquivo não encontrado" });
    } else {
      res.sendFile(filePath);
    }
  });
});

app.delete("/file/:filename", (req, res) => {
  const filename = req.params.filename;

  const filePath = path.join(__dirname, "uploads", filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).json({ message: "Arquivo não encontrado" });
    } else {
      fs.rmSync(filePath, { force: true });
      res.json({ message: "Arquivo apagado com sucesso" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
