"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT);
const baseUrl = process.env.APP_BASE_URL;
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const uploadPath = path_1.default.join(process.cwd(), "assets", "uploads");
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: process.env.ORIGIN_URL,
}));
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Falha no upload do arquivo" });
    }
    // const uploadPath = path.join(__dirname, "uploads");
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath);
    }
    var file = req.file;
    const filename = (0, uuid_1.v4)() + "-" + Date.now() + path_1.default.extname(file.originalname);
    var filePath = path_1.default.join(uploadPath, filename);
    try {
        const fileType = file.mimetype;
        var successResponse = {
            message: "Upload bem-sucedido",
            filename,
            filePath: baseUrl + `/file/` + filename,
        };
        if (fileType.startsWith("image/")) {
            await (0, sharp_1.default)(file.buffer).toFile(filePath);
            return res.json(successResponse);
        }
        else if (fileType === "application/pdf") {
            let bodyFilename = req.body.filename;
            if (bodyFilename) {
                filePath = path_1.default.join(uploadPath, bodyFilename);
                successResponse.filePath = baseUrl + `/file/` + bodyFilename;
            }
            await fs_1.default.promises.writeFile(filePath, req.file.buffer);
            return res.json(successResponse);
        }
        else {
            return res.status(400).json({ message: "Tipo de arquivo não suportado" });
        }
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Erro ao processar o arquivo", error });
    }
});
app.get("/file/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path_1.default.join(uploadPath, filename);
    fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            res.status(404).json({ message: "Arquivo não encontrado" });
        }
        else {
            res.sendFile(filePath);
        }
    });
});
app.delete("/file/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path_1.default.join(uploadPath, filename);
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
        const file = _file.replace(`${baseUrl}/file/`, "");
        const filePath = path_1.default.join(uploadPath, file);
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
    }));
    if (errors.length > 0) {
        res.status(500).json({ message: "Erros ao apagar arquivos", errors });
    }
    else {
        res.json({ message: "Arquivos apagados com sucesso" });
    }
});
app.listen(PORT, () => {
    console.log(`Servidor rodando em ${baseUrl}`);
});
