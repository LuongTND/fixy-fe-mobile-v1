import { apiClient } from './client';

export interface Review {
  id: string;
  rating: number;
  comment: string;
  workerReply: string | null;
  createdAt: string;
  repliedAt: string | null;
  bookingId: string;
  images: string[];
  customer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface ReviewSubmission {
  Rating: number;
  Comment: string;
  Images?: File[] | any[];
}

function unwrapData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

/** POST /reviews/{bookingId} — Submit a review (multipart) */
export async function submitReview(bookingId: string, data: ReviewSubmission): Promise<Review> {
  const formData = new FormData();
  formData.append('Rating', String(data.Rating));
  formData.append('Comment', data.Comment);

  if (data.Images && data.Images.length > 0) {
    data.Images.forEach((img: any) => {
      formData.append('Images', img);
    });
  }

  const response = await apiClient.post(`/reviews/${bookingId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return unwrapData<Review>(response.data);
}

/** GET /reviews/booking/{bookingId} — Get review for a specific booking */
export async function getBookingReview(bookingId: string): Promise<Review | null> {
  try {
    const response = await apiClient.get(`/reviews/booking/${bookingId}`);
    return unwrapData<Review>(response.data);
  } catch {
    return null;
  }
}

/** GET /reviews/worker/{workerId}/paged — Get paged reviews for a worker */
export async function getWorkerReviews(
  workerId: string,
  params?: { PageNumber?: number; PageSize?: number }
): Promise<{ items: Review[]; totalCount: number }> {
  const response = await apiClient.get(`/reviews/worker/${workerId}/paged`, { params });
  const data = unwrapData<any>(response.data);
  return {
    items: data?.items ?? (Array.isArray(data) ? data : []),
    totalCount: data?.totalCount ?? 0,
  };
}

/** POST /reviews/{reviewId}/reply — Worker replies to a review */
export async function replyToReview(reviewId: string, reply: string): Promise<any> {
  const formData = new FormData();
  formData.append('Reply', reply);

  const response = await apiClient.post(`/reviews/${reviewId}/reply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return unwrapData(response.data);
}
