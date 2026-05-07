"use client";

import { Star, Trophy } from "lucide-react";
import type { Review } from "@/shared/api/endpoints/profile";

type Props = { reviews: Review[] };

const initialsFrom = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export const ProfileReviewsTab = ({ reviews }: Props) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] py-8 text-center">
        <Trophy size={28} className="mx-auto mb-3 text-[var(--fg-3)]" />
        <p className="text-sm text-[var(--fg-2)]">Отзывов пока нет</p>
        <p className="text-xs text-[var(--fg-3)]">Завершите первый заказ, чтобы получить отзыв</p>
      </div>
    );
  }

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="mt-4 space-y-4">
      <div className="glass-card flex items-center gap-4 rounded-xl p-4">
        <div className="text-3xl font-bold text-[var(--fg-0)]">{avgRating}</div>
        <div>
          <div className="mb-1 flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.round(Number(avgRating)) ? "fill-[var(--warn)] text-[var(--warn)]" : "text-[var(--bg-3)]"}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--fg-3)]">
            {reviews.length} {reviews.length === 1 ? "отзыв" : "отзывов"}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {reviews.map((review, i) => (
          <div key={review.id}>
            <div className="py-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.1)] text-[11px] font-bold text-[var(--mint-300)]">
                  {initialsFrom(review.reviewer_name)}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--fg-0)]">{review.reviewer_name}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star
                      key={si}
                      size={14}
                      className={si < review.rating ? "fill-[var(--warn)] text-[var(--warn)]" : "text-[var(--bg-3)]"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-[var(--fg-1)]">{review.comment}</p>
            </div>
            {i < reviews.length - 1 && <div className="h-px bg-[var(--line)]" />}
          </div>
        ))}
      </div>
    </div>
  );
};
