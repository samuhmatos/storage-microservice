import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import { uploadFile } from "../useCases/useUploadFile";
import { v4 as uuidv4 } from "uuid";

const app = express();

const PORT = Number(process.env.PORT);
export const BASE_URL = process.env.APP_BASE_URL!;

const storage = multer.memoryStorage();

const upload = multer({ storage });

const BASE_PATH = path.join(process.cwd(), "assets");
export const UPLOAD_PATH = path.join(BASE_PATH, "uploads");
export const UPLOAD_TMP_PATH = path.join(BASE_PATH, "tmp");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  const allowedOrigins = [process.env.ORIGIN_URL, "http://localhost:3000"];

  app.use(
    cors({
      origin(requestOrigin, callback) {
        console.log("origin", requestOrigin);
        console.log(allowedOrigins)

        if (!requestOrigin || allowedOrigins.indexOf(requestOrigin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    })
  );
}

app.use(express.static(path.join(process.cwd(), "assets")));

app.post("/upload", upload.single("file"), async (req, res) => {
  let body = req.body;

  let tmp = body.tmp == "true" ? true : false;
  let reset = body.reset == "true" ? true : false;
  let _filename = body.filename as string | undefined;

  let file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Falha no upload do arquivo",
    });
  }

  var filename =
    _filename || uuidv4() + "-" + Date.now() + path.extname(file.originalname);

  const upload = await uploadFile(
    {
      file,
      filename,
    },
    tmp
  );

  if (reset) {
    let tmpPath = path.join(UPLOAD_TMP_PATH, file.originalname);

    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { recursive: true, force: true });
    }
  }

  if (upload.error) {
    let { code, ...rest } = upload.error;
    return res.status(code).json(rest);
  }

  if (upload.success) {
    return res.json(upload.success);
  }
});

app.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_PATH, filename);
  const tmpFilePath = path.join(UPLOAD_TMP_PATH, filename);

  const tmpQuery = Boolean(req.query.tmp) || false;

  let finalPath = tmpQuery ? tmpFilePath : filePath;

  const exist = fs.existsSync(finalPath);

  if (!exist) {
    res.status(404).json({ message: "Arquivo não encontrado" });
    return;
  }

  return res.sendFile(finalPath);
});

app.delete("/file/:filename", (req, res) => {
  const filename = req.params.filename;

  const filePath = path.join(UPLOAD_PATH, filename);

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
      if (_file) {
        const file = _file.replace(`${BASE_URL}/file/`, "");
        const filePath = path.join(UPLOAD_PATH, file);

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
      }
    })
  );

  if (errors.length > 0) {
    res.status(500).json({ message: "Erros ao apagar arquivos", errors });
  } else {
    res.json({ message: "Arquivos apagados com sucesso" });
  }
});

app.delete("/file/cleanTemp", async (req, res) => {
  fs.rmdirSync(UPLOAD_TMP_PATH, { recursive: true });

  res.json({ message: "Arquivos temporários apagados com sucesso" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em ${BASE_URL}`);
});
