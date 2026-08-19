import axios from 'axios';

import { getFptAiApiKey, getFptProxyBaseUrl } from '@/config/env';
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

function unwrapData(payload: any) {
  return payload?.data ?? payload;
}

function getRecognitionSource(payload: any) {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data[0] ?? {};
  return data ?? {};
}

function assertSuccessfulRecognition(payload: any) {
  if (typeof payload?.errorCode === 'number' && payload.errorCode !== 0) {
    throw new Error(payload.errorMessage || 'Không thể nhận diện CCCD từ ảnh đã chọn.');
  }
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

function normalizeRecognition(raw: any): FptIdentityRecognitionResult {
  assertSuccessfulRecognition(raw);
  const source = getRecognitionSource(raw);

  return {
    type: pickString(source, ['type_new', 'type', 'cardType', 'documentType']),
    citizenIdNumber: pickString(source, [
      'citizenIdNumber',
      'id',
      'idNumber',
      'id_number',
      'cardNumber',
    ]),
    issueDate: normalizeDate(pickString(source, ['issueDate', 'issue_date', 'issuedAt'])),
    issuePlace: pickString(source, ['issuePlace', 'issue_loc', 'issue_place', 'poi', 'issuedBy']),
    fullName: pickString(source, ['fullName', 'name', 'full_name']),
    dateOfBirth: normalizeDate(pickString(source, ['dateOfBirth', 'dob', 'birthday'])),
    address: pickString(source, ['address', 'home', 'residentAddress']),
  };
}

function buildImageFile(uri: string, fallbackName: string) {
  const filename = uri.split('/').pop() || fallbackName;
  const match = /\.(\w+)$/.exec(filename);
  const extension = match?.[1]?.toLowerCase();
  const type = extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg';

  return {
    uri,
    name: filename,
    type,
  } as any;
}

export async function recognizeIdentityImage(
  imageUri: string
): Promise<FptIdentityRecognitionResult> {
  const formData = new FormData();
  const fileObj = await prepareUploadFile(imageUri, `identity_${Date.now()}.jpg`, { compress: false });
  if (fileObj) {
    formData.append('image', fileObj);
  }
  const fptApiKey = getFptAiApiKey();

  const response = fptApiKey
    ? await axios.post('https://api.fpt.ai/vision/idr/vnm', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'api-key': fptApiKey,
        },
        transformRequest: (data) => data,
      })
    : await axios.post(`${getFptProxyBaseUrl()}/api/fpt/identity-recognition`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });

  return normalizeRecognition(response.data);
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
  const file1 = await prepareUploadFile(cardFrontUri, `card_${Date.now()}.jpg`, { compress: false });
  const file2 = await prepareUploadFile(selfieUri, `selfie_${Date.now()}.jpg`, { compress: false });

  if (file1) {
    formData.append('file[]', file1);
  }
  if (file2) {
    formData.append('file[]', file2);
  }

  const fptApiKey = getFptAiApiKey();

  try {
    const response = fptApiKey
      ? await axios.post('https://api.fpt.ai/dmp/checkface/v1', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'api-key': fptApiKey,
          },
          transformRequest: (data) => data,
        })
      : await axios.post(`${getFptProxyBaseUrl()}/api/fpt/face-match`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          transformRequest: (data) => data,
        });

    const resData = response.data?.data ?? response.data;
    const similarity = typeof resData?.similarity === 'number'
      ? resData.similarity
      : parseFloat(resData?.similarity || '0');

    const isBothFaceFound = resData?.is_both_face_found ?? resData?.isBothFaceFound ?? true;
    const isMatch = (resData?.is_match ?? resData?.isMatch ?? (similarity >= 80)) && isBothFaceFound;

    return {
      isMatch,
      similarity: isNaN(similarity) ? 0 : similarity,
      isBothFaceFound,
      message: response.data?.message || (isMatch ? 'Khuôn mặt trùng khớp' : 'Khuôn mặt không trùng khớp'),
    };
  } catch (err: any) {
    console.warn('[FPT AI] Face Match error:', err?.response?.data || err?.message);
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.errorMessage ||
        'Không thể so khớp khuôn mặt lúc này. Vui lòng thử lại.'
    );
  }
}

