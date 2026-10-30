import { apiRequest } from "./api";
import { ensureCloudinaryUrl } from "./uploadService";

export interface ReviewCreateInput {
  barber_id: number;
  rating: number; // 1 to 5
  booking_id?: number | null;
  comment?: string | null;
  tags?: string[] | null;
  photo_url?: string | null;
}

export interface ReviewItemResponse {
  id?: number | string;
  barber_id: number;
  client_id?: number;
  client_name?: string;
  rating: number;
  comment?: string;
  tags?: string[];
  photo_url?: string;
  created_at?: string;
  reply?: string | null;
  replied_at?: string | null;
}

export interface BarberReviewsResponse {
  average_rating: number;
  total_reviews: number;
  rating_distribution?: Record<number, number>;
  reviews: ReviewItemResponse[];
}

export const reviewService = {
  /**
   * Submit a new rating & review for a barber or salon.
   * Endpoint: POST /api/v1/reviews/
   */
  async submitReview(data: ReviewCreateInput): Promise<any> {
    const payload = { ...data };
    if (payload.photo_url) {
      payload.photo_url = (await ensureCloudinaryUrl(payload.photo_url, "review")) ?? payload.photo_url;
    }
    return apiRequest("/api/v1/reviews/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch all reviews and average rating for a barber or salon.
   * Endpoint: GET /api/v1/reviews/barber/{barber_id}
   */
  async getBarberReviews(barberId: number): Promise<BarberReviewsResponse> {
    try {
      const res = await apiRequest<BarberReviewsResponse>(
        `/api/v1/reviews/barber/${barberId}`,
        { method: "GET" }
      );
      if (res && Array.isArray(res.reviews)) {
        return res;
      }
    } catch {
      // Empty if database query fails
    }

    return {
      average_rating: 0.0,
      total_reviews: 0,
      reviews: [],
    };
  },

  /**
   * Submit or update a barber's reply to a client review.
   * Endpoint: POST /api/v1/reviews/{review_id}/reply
   */
  async replyToReview(
    reviewId: number | string,
    reply: string
  ): Promise<{ success: boolean; reply: string; replied_at: string }> {
    const res = await apiRequest<{ status?: string; reply: string; replied_at: string }>(
      `/api/v1/reviews/${reviewId}/reply`,
      {
        method: "POST",
        body: JSON.stringify({ reply }),
      }
    );
    return {
      success: true,
      reply: res?.reply || reply,
      replied_at: res?.replied_at || new Date().toISOString(),
    };
  },
};
