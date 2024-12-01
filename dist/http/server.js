"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_TMP_PATH = exports.UPLOAD_PATH = exports.BASE_URL = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const useUploadFile_1 = require("../useCases/useUploadFile");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT);
exports.BASE_URL = process.env.APP_BASE_URL;
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const BASE_PATH = path_1.default.join(process.cwd(), "assets");
exports.UPLOAD_PATH = path_1.default.join(BASE_PATH, "uploads");
exports.UPLOAD_TMP_PATH = path_1.default.join(BASE_PATH, "tmp");
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "production") {
    const allowedOrigins = [process.env.ORIGIN_URL, "http://localhost:3000"];
    app.use((0, cors_1.default)({
        origin(requestOrigin, callback) {
            console.log("origin", requestOrigin);
            console.log(allowedOrigins);
            if (!requestOrigin || allowedOrigins.indexOf(requestOrigin) !== -1) {
                callback(null, true);
            }
            else {
                callback(new Error("Not allowed by CORS"));
            }
        },
    }));
}
app.use(express_1.default.static(path_1.default.join(process.cwd(), "assets")));
app.post("/upload", upload.single("file"), async (req, res) => {
    let body = req.body;
    let tmp = body.tmp == "true" ? true : false;
    let reset = body.reset == "true" ? true : false;
    let _filename = body.filename;
    let file = req.file;
    if (!file) {
        return res.status(400).json({
            message: "Falha no upload do arquivo",
        });
    }
    var filename = _filename || (0, uuid_1.v4)() + "-" + Date.now() + path_1.default.extname(file.originalname);
    const upload = await (0, useUploadFile_1.uploadFile)({
        file,
        filename,
    }, tmp);
    if (reset) {
        let tmpPath = path_1.default.join(exports.UPLOAD_TMP_PATH, file.originalname);
        if (fs_1.default.existsSync(tmpPath)) {
            fs_1.default.rmSync(tmpPath, { recursive: true, force: true });
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
    const filePath = path_1.default.join(exports.UPLOAD_PATH, filename);
    const tmpFilePath = path_1.default.join(exports.UPLOAD_TMP_PATH, filename);
    const tmpQuery = Boolean(req.query.tmp) || false;
    let finalPath = tmpQuery ? tmpFilePath : filePath;
    const exist = fs_1.default.existsSync(finalPath);
    if (!exist) {
        res.status(404).json({ message: "Arquivo não encontrado" });
        return;
    }
    return res.sendFile(finalPath);
});
app.delete("/file/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path_1.default.join(exports.UPLOAD_PATH, filename);
    fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            res.status(404).json({ message: "Arquivo não encontrado" });
        }
        else {
            fs_1.default.rmSync(filePath, { force: true });
            res.json({ message: "Arquivo apagado com sucesso" });
        }
    });
});
app.post("/file/deleteMany", async (req, res) => {
    const fileList = req.body.fileList;
    if (!fileList || !Array.isArray(fileList)) {
        return res.status(403).json({
            message: "Para apagar um ou mais arquivos, envie uma lista de arquivos",
        });
    }
    let errors = [];
    await Promise.all(fileList.map(async (_file) => {
        if (_file) {
            const file = _file.replace(`${exports.BASE_URL}/file/`, "");
            const filePath = path_1.default.join(exports.UPLOAD_PATH, file);
            const exist = await fs_1.default.existsSync(filePath);
            if (exist) {
                try {
                    await fs_1.default.rmSync(filePath, { force: true });
                }
                catch (err) {
                    return errors.push({
                        file,
                        message: "Erro ao apagar o arquivo",
                        error: err,
                    });
                }
            }
            else {
                return errors.push({ file, message: "Arquivo não encontrado" });
            }
        }
    }));
    if (errors.length > 0) {
        res.status(500).json({ message: "Erros ao apagar arquivos", errors });
    }
    else {
        res.json({ message: "Arquivos apagados com sucesso" });
    }
});
app.delete("/file/cleanTemp", async (req, res) => {
    fs_1.default.rmdirSync(exports.UPLOAD_TMP_PATH, { recursive: true });
    res.json({ message: "Arquivos temporários apagados com sucesso" });
});
app.listen(PORT, () => {
    console.log(`Servidor rodando em ${exports.BASE_URL}`);
});
