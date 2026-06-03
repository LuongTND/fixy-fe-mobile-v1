import axios from 'axios';

import { getFptAiApiKey, getFptProxyBaseUrl } from '@/config/env';

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
  formData.append('image', buildImageFile(imageUri, `identity_${Date.now()}.jpg`));
  const fptApiKey = getFptAiApiKey();

  const response = fptApiKey
    ? await axios.post('https://api.fpt.ai/vision/idr/vnm/', formData, {
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
