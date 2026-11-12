import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
const watermarkPublicId =
  process.env.CLOUDINARY_WATERMARK_PUBLIC_ID ?? "locatepedia/watermark";
const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "locatepedia";

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured() {
  return !!cloudName && !!apiKey && !!apiSecret;
}

export function signUpload(opts: { folder?: string; tags?: string[] } = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary not configured");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = {
    timestamp,
    folder: opts.folder ?? folder,
  };
  if (opts.tags?.length) params.tags = opts.tags.join(",");

  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return {
    cloudName,
    apiKey,
    timestamp,
    folder: params.folder as string,
    signature,
    tags: params.tags as string | undefined,
  };
}

const PUBLIC_CLOUD =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? cloudName;

/**
 * Build a delivery URL. For INSPIRATION photos we apply a watermark overlay.
 */
export function imageUrl(
  publicId: string,
  opts: {
    width?: number;
    height?: number;
    watermark?: boolean;
    crop?: "fill" | "fit" | "limit";
  } = {},
) {
  if (!PUBLIC_CLOUD || !publicId) return "";

  const transforms: string[] = ["f_auto", "q_auto"];
  if (opts.width) transforms.push(`w_${opts.width}`);
  if (opts.height) transforms.push(`h_${opts.height}`);
  transforms.push(`c_${opts.crop ?? "fill"}`);

  const base = transforms.join(",");
  const segments = [base];

  if (opts.watermark && watermarkPublicId) {
    const overlay = `l_${watermarkPublicId.replace(/\//g, ":")},o_45,w_0.4,fl_relative,g_south_east,x_20,y_20`;
    segments.push(overlay);
  }

  return `https://res.cloudinary.com/${PUBLIC_CLOUD}/image/upload/${segments.join("/")}/${publicId}`;
}
