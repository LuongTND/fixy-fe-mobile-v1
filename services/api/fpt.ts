import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';

import { getGeminiApiKey } from '@/config/env';
import { apiClient } from './client';
import { prepareUploadFile } from './media';

export type FptIdentityRecognitionResult = {
  type: string;
  citizenIdNumber: string;
  issueDate: string;
  issuePlace: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
};

// ──────────────────────────────────────────────────
// Shared helpers (used by both Gemini and FPT paths)
// ──────────────────────────────────────────────────

function normalizeDate(value: string) {
  if (!value) return '';

  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    return `${dmyMatch[3]}-${month}-${day}`;
  }

  return trimmed;
}

function pickString(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim() && value.trim().toUpperCase() !== 'N/A') {
      return value.trim();
    }
  }
  return '';
}

// ──────────────────────────────────────────────────
// Gemini Flash OCR
// ──────────────────────────────────────────────────

const GEMINI_CCCD_PROMPT = `Bạn là hệ thống OCR chuyên dụng cho Căn cước công dân (CCCD) Việt Nam.
Hãy phân tích ảnh CCCD này và trích xuất các thông tin sau dưới dạng JSON.
Nếu đây là mặt trước CCCD, trích xuất: citizenIdNumber, fullName, dateOfBirth, address.
Nếu đây là mặt sau CCCD, trích xuất: issueDate, issuePlace.
Với các trường không có trong ảnh, hãy để chuỗi rỗng "".
Định dạng ngày tháng: YYYY-MM-DD (ví dụ: 2021-05-20).

Trả về JSON theo đúng cấu trúc sau:
{
  "type": "CCCD" hoặc "CMND" hoặc "",
  "citizenIdNumber": "số CCCD 12 chữ số hoặc rỗng",
  "fullName": "Họ và tên đầy đủ hoặc rỗng",
  "dateOfBirth": "YYYY-MM-DD hoặc rỗng",
  "issueDate": "YYYY-MM-DD hoặc rỗng",
  "issuePlace": "Nơi cấp hoặc rỗng",
  "address": "Nơi thường trú hoặc rỗng"
}`;

async function imageUriToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  let processedUri = uri;

  // Compress and resize to reduce payload size
  if (uri.startsWith('file://') || uri.startsWith('content://') || !uri.startsWith('http')) {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipResult.base64) {
        return { base64: manipResult.base64, mimeType: 'image/jpeg' };
      }
      processedUri = manipResult.uri;
    } catch {
      // Fall back to original URI if manipulation fails
    }
  }

  // Fallback: read file as blob and convert to base64
  const response = await fetch(processedUri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      const base64Data = dataUrl.split(',')[1] || dataUrl;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType: 'image/jpeg' };
}

async function recognizeWithGemini(imageUri: string): Promise<FptIdentityRecognitionResult> {
  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const { base64, mimeType } = await imageUriToBase64(imageUri);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: GEMINI_CCCD_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  let response: any;
  // Prioritize Flash-Lite models for highest stability, lowest latency, and no high-demand throttling
  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );
      if (response.data) {
        lastError = null;
        break;
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      // If temporary high demand (503), rate limit (429), server error (500/502/504), or model unavailable (404), seamlessly try next model
      if ([404, 429, 500, 502, 503, 504].includes(status) && model !== models[models.length - 1]) {
        continue;
      }
      throw err;
    }
  }

  if (lastError && !response?.data) {
    throw lastError;
  }

  const textContent =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    console.warn('[Gemini OCR] Failed to parse JSON response:', textContent);
    throw new Error('Không thể phân tích kết quả nhận diện CCCD từ Gemini.');
  }

  return {
    type: (parsed.type || '').trim(),
    citizenIdNumber: (parsed.citizenIdNumber || '').trim(),
    fullName: (parsed.fullName || '').trim(),
    dateOfBirth: normalizeDate(parsed.dateOfBirth || ''),
    issueDate: normalizeDate(parsed.issueDate || ''),
    issuePlace: (parsed.issuePlace || '').trim(),
    address: (parsed.address || '').trim(),
  };
}

// ──────────────────────────────────────────────────
// Public API: Gemini OCR for CCCD
// ──────────────────────────────────────────────────

export async function recognizeIdentityImage(
  imageUri: string
): Promise<FptIdentityRecognitionResult> {
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm GEMINI_API_KEY vào .env hoặc nhập thông tin CCCD thủ công.'
    );
  }

  try {
    const result = await recognizeWithGemini(imageUri);
    console.log('[Gemini OCR] Recognition successful');
    return result;
  } catch (err: any) {
    console.warn('[Gemini OCR] Recognition error:', err?.response?.data || err?.message);
    throw new Error(
      err?.message || 'Không thể nhận diện CCCD tự động. Vui lòng kiểm tra ảnh hoặc nhập thông tin thủ công.'
    );
  }
}

export type FptFaceMatchResult = {
  isMatch: boolean;
  similarity: number;
  isBothFaceFound: boolean;
  message?: string;
};

export async function compareFaces(
  cardFrontUri: string,
  selfieUri: string
): Promise<FptFaceMatchResult> {
  const formData = new FormData();
  const file1 = await prepareUploadFile(cardFrontUri, `card_${Date.now()}.jpg`, {
    compress: true,
    resizeWidth: 1024,
  });
  const file2 = await prepareUploadFile(selfieUri, `selfie_${Date.now()}.jpg`, {
    compress: true,
    resizeWidth: 1024,
  });

  if (file1) {
    formData.append('CardFrontImage', file1);
  }
  if (file2) {
    formData.append('SelfieImage', file2);
  }

  try {
    const response = await apiClient.post('/worker-profiles/verify-face', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
      timeout: 30000,
    });

    const resData = response.data?.data ?? response.data;
    const similarity =
      typeof resData?.similarity === 'number'
        ? resData.similarity
        : parseFloat(resData?.similarity || '0');

    const isBothFaceFound = resData?.isBothFaceFound ?? resData?.is_both_face_found ?? true;
    const isMatch = Boolean(resData?.isMatch ?? resData?.is_match ?? similarity >= 75);

    return {
      isMatch,
      similarity: isNaN(similarity) ? 0 : similarity,
      isBothFaceFound,
      message:
        resData?.message ||
        response.data?.message ||
        (isMatch ? 'Khuôn mặt trùng khớp với CCCD' : 'Khuôn mặt không trùng khớp với CCCD'),
    };
  } catch (err: any) {
    console.warn('[Face Recognition API] Face Match error:', err?.response?.data || err?.message);
    const backendMessage =
      err?.response?.data?.message ||
      err?.response?.data?.errors?.[0] ||
      err?.message;
    throw new Error(
      backendMessage || 'Không thể so khớp khuôn mặt lúc này. Vui lòng thử lại.'
    );
  }
}

