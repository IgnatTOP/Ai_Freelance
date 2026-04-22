"use client";

import { Avatar, Divider } from "@heroui/react";
import { Star, Trophy } from "lucide-react";
import type { Review } from "@/shared/api/endpoints/profile";

type Props = { reviews: Review[] };

export const ProfileReviewsTab = ({ reviews }: Props) => {
    if (!reviews || reviews.length === 0) {
        return (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl mt-4">
                <Trophy size={28} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-sm text-zinc-500">Отзывов пока нет</p>
                <p className="text-xs text-zinc-600">Завершите первый заказ, чтобы получить отзыв</p>
            </div>
        );
    }

    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

    return (
        <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 glass-card rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{avgRating}</div>
                <div>
                    <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={16} className={i < Math.round(Number(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"} />
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500">{reviews.length} {reviews.length === 1 ? "отзыв" : "отзывов"}</p>
                </div>
            </div>

            {/* Reviews list */}
            <div className="space-y-1">
                {reviews.map((review, i) => (
                    <div key={review.id}>
                        <div className="py-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar size="sm" showFallback classNames={{ base: "bg-emerald-600/20", icon: "text-emerald-400" }} />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-zinc-200">{review.reviewer_name}</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, si) => (
                                        <Star key={si} size={14} className={si < review.rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{review.comment}</p>
                        </div>
                        {i < reviews.length - 1 && <Divider className="bg-white/[0.04]" />}
                    </div>
                ))}
            </div>
        </div>
    );
};
