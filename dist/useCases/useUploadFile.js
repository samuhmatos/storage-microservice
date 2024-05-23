"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const server_1 = require("../http/server");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
function genPath(filename, tmp) {
    let path = server_1.BASE_URL + `/file/` + filename;
    if (tmp)
        path += `?tmp=true`;
    return path;
}
async function uploadFile({ file, filename }, tmp) {
    var uploadPath = tmp ? server_1.UPLOAD_TMP_PATH : server_1.UPLOAD_PATH;
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath);
    }
    var filePath = path_1.default.join(uploadPath, filename);
    try {
        const fileType = file.mimetype;
        var successResponse = {
            message: "Upload bem-sucedido",
            filename,
            filePath: genPath(filename, tmp),
        };
        if (fileType.startsWith("image/")) {
            await (0, sharp_1.default)(file.buffer).toFile(filePath);
            return {
                success: successResponse,
            };
        }
        else if (fileType === "application/pdf") {
            await fs_1.default.promises.writeFile(filePath, file.buffer);
            return {
                success: successResponse,
            };
        }
        else {
            return {
                error: {
                    code: 400,
                    message: "Tipo de arquivo não suportado",
                },
            };
        }
    }
    catch (error) {
        return {
            error: {
                code: 500,
                message: "Erro ao processar o arquivo",
                error,
            },
        };
    }
}
exports.uploadFile = uploadFile;
