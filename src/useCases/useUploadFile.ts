import fs from "fs";
import { BASE_URL, UPLOAD_PATH, UPLOAD_TMP_PATH } from "../http/server";
import path from "path";
import sharp from "sharp";

interface Payload {
  file: Express.Multer.File;
  filename: string;
}

function genPath(filename: string, tmp: boolean) {
  let path = BASE_URL + `/file/` + filename;

  if (tmp) path += `?tmp=true`;

  return path;
}

export async function uploadFile(
  { file, filename }: Payload,
  tmp: boolean
): Promise<{
  error?: {
    code: number;
    message?: string;
    error?: unknown;
  };
  success?: {
    message: string;
    filename: string;
    filePath: string;
    width?: number;
    height?: number;
  };
}> {
  var uploadPath = tmp ? UPLOAD_TMP_PATH : UPLOAD_PATH;

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
  }

  var filePath = path.join(uploadPath, filename);

  try {
    const fileType = file.mimetype;

    var successResponse = {
      message: "Upload bem-sucedido",
      filename,
      filePath: genPath(filename, tmp),
    };

    if (fileType.startsWith("image/")) {
      const metadata = await sharp(file.buffer).rotate().toFile(filePath);

      return {
        success: {
          ...successResponse,
          width: metadata.width,
          height: metadata.height,
        },
      };
    } else if (fileType === "application/pdf") {
      await fs.promises.writeFile(filePath, file.buffer);

      return {
        success: successResponse,
      };
    } else {
      return {
        error: {
          code: 400,
          message: "Tipo de arquivo não suportado",
        },
      };
    }
  } catch (error) {
    return {
      error: {
        code: 500,
        message: "Erro ao processar o arquivo",
        error,
      },
    };
  }
}
