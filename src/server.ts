import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();

const PORT = Number(process.env.PORT);
const baseUrl = process.env.APP_BASE_URL!;

const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadPath = path.join(process.cwd(), "assets", "uploads");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ORIGIN_URL,
  })
);

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Falha no upload do arquivo" });
  }

  // const uploadPath = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
  }

  var file = req.file;

  const filename =
    uuidv4() + "-" + Date.now() + path.extname(file.originalname);

  var filePath = path.join(uploadPath, filename);

  try {
    const fileType = file.mimetype;

    var successResponse = {
      message: "Upload bem-sucedido",
      filename,
      filePath: baseUrl + `/file/` + filename,
    };

    if (fileType.startsWith("image/")) {
      await sharp(file.buffer).toFile(filePath);

      return res.json(successResponse);
    } else if (fileType === "application/pdf") {
      let bodyFilename = req.body.filename as string | undefined;

      if (bodyFilename) {
        filePath = path.join(uploadPath, bodyFilename);
        successResponse.filePath = baseUrl + `/file/` + bodyFilename;
      }

      await fs.promises.writeFile(filePath, req.file.buffer);

      return res.json(successResponse);
    } else {
      return res.status(400).json({ message: "Tipo de arquivo não suportado" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao processar o arquivo", error });
  }
});

app.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadPath, filename);

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

  const filePath = path.join(uploadPath, filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).json({ message: "Arquivo não encontrado" });
    } else {
      fs.rmSync(filePath, { force: true });
      res.json({ message: "Arquivo apagado com sucesso" });
    }
  });
});

app.post("/file/deleteMany", async (req, res) => {
  const fileList = req.body.fileList as string[] | undefined;

  if (!fileList || !Array.isArray(fileList)) {
    return res.status(403).json({
      message: "Para apagar um ou mais arquivos, envie uma lista de arquivos",
    });
  }

  let errors: { file: string; message: string; error?: any }[] = [];

  await Promise.all(
    fileList.map(async (_file) => {
      const file = _file.replace(`${baseUrl}/file/`, "");
      const filePath = path.join(uploadPath, file);

      const exist = await fs.existsSync(filePath);

      if (exist) {
        try {
          await fs.rmSync(filePath, { force: true });
        } catch (err) {
          return errors.push({
            file,
            message: "Erro ao apagar o arquivo",
            error: err,
          });
        }
      } else {
        return errors.push({ file, message: "Arquivo não encontrado" });
      }
    })
  );

  if (errors.length > 0) {
    res.status(500).json({ message: "Erros ao apagar arquivos", errors });
  } else {
    res.json({ message: "Arquivos apagados com sucesso" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em ${baseUrl}`);
});
