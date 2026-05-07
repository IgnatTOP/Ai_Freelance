"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, FolderOpen, MessageSquare, Rss, Shield, Sparkles, Star, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { conversationsApi } from "@/shared/api/endpoints/conversations";
import { notify } from "@/shared/notifications/notify";
import { profileApi, type PortfolioItem, type Profile, type Review } from "@/shared/api/endpoints/profile";
import { EmptyState } from "@/shared/ui/empty-state/EmptyState";
import { FilkaButton, FilkaCard, FilkaChip } from "@/shared/ui/filka/FilkaPrimitives";
import { Logo } from "@/shared/ui/logo/Logo";
import { ProfileFeedTab } from "./profile/ProfileFeedTab";
import { ProfileServicesTab } from "./profile/ProfileServicesTab";

type Props = { userId: string };

const formatCurrency = (value?: number): string =>
  typeof value === "number" ? `${value.toLocaleString("ru-RU")} ₽ / час` : "Ставка не указана";

const gradients = [
  "linear-gradient(135deg,#B6D9FC,#4F2BC7)",
  "linear-gradient(135deg,#663AF3,#064E3B)",
  "linear-gradient(135deg,#FFB38A,#F5E27A)",
  "linear-gradient(135deg,#7DD3FC,#0284C7)",
  "linear-gradient(135deg,#D1E4FA,#1a0e4a)",
  "linear-gradient(135deg,#5EEAD4,#0F766E)",
] as const;

const getInitials = (name?: string): string =>
  (name ?? "Филка")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "FL";

const skillWeight = (index: number): number => Math.max(72, 98 - index * 4);

export const PublicProfilePage = ({ userId }: Props) => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [profileData, portfolioData, reviewsData] = await Promise.all([
          profileApi.getPublicProfile(userId),
          profileApi.getPublicPortfolio(userId).catch(() => [] as PortfolioItem[]),
          profileApi.getReviews(userId).catch(() => [] as Review[]),
        ]);
        setProfile(profileData);
        setPortfolio(portfolioData);
        setReviews(reviewsData);
      } catch {
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [userId]);

  const handleStartChat = async () => {
    setIsCreatingChat(true);
    try {
      const conversations = await conversationsApi.getMyConversations();
      const conversation = conversations.find((item) => item.other_user?.id === userId);
      if (conversation) {
        router.push(`/dashboard/messages/${conversation.id}` as never);
        return;
      }
      notify.info({
        title: "Диалог появится после сделки",
        message: "Откройте заказ или примите отклик, чтобы создать рабочий чат.",
      });
      router.push("/dashboard/orders" as never);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const topSkills = useMemo(() => (profile?.skills ?? []).slice(0, 6), [profile?.skills]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-[280px] rounded-[24px] border border-[var(--line)] bg-[var(--bg-1)]" />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="h-36 rounded-[20px] border border-[var(--line)] bg-[var(--bg-1)]" />
            <div className="h-64 rounded-[20px] border border-[var(--line)] bg-[var(--bg-1)]" />
          </div>
          <div className="h-80 rounded-[20px] border border-[var(--line)] bg-[var(--bg-1)]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={<User size={24} />}
        title="Пользователь не найден"
        description="Профиль не существует или был удалён."
        action={
          <FilkaButton variant="ghost" onClick={() => router.back()}>
            Назад
          </FilkaButton>
        }
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <section className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--bg-2)]">
        <div
          className="h-[150px]"
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 20% 50%, rgba(102,58,243,0.25), transparent 70%)," +
              "radial-gradient(ellipse 40% 100% at 80% 50%, rgba(186,215,247,0.15), transparent 70%)," +
              "#0c1812",
          }}
        />
        <div className="flex flex-col gap-6 px-6 pb-6 sm:px-8 lg:flex-row lg:items-end lg:gap-8">
          <div className="relative -mt-12">
            <div className="grid h-24 w-24 place-items-center rounded-[22px] border-4 border-[var(--bg-2)] bg-[linear-gradient(135deg,#B6D9FC,#1a0e4a)] text-[28px] font-bold text-[#05060f]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="h-full w-full rounded-[18px] object-cover" />
              ) : (
                getInitials(profile.name)
              )}
            </div>
            <div className="absolute -bottom-2 right-[-6px] flex items-center gap-1 rounded-full border-2 border-[var(--bg-2)] bg-[var(--mint-400)] px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] text-[#05060f]">
              <Shield size={10} />
              VERIFIED
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--fg-0)]">{profile.name || "Пользователь"}</h1>
              <FilkaChip>PRO · top 5%</FilkaChip>
            </div>
            <div className="mb-3 text-[15px] text-[var(--fg-1)]">
              {profile.role === "client" ? "Заказчик" : "Фрилансер"} · {(profile.skills ?? []).slice(0, 4).join(" · ") || "Профиль в процессе заполнения"}
            </div>
            <div className="flex flex-wrap gap-4 text-[13px] text-[var(--fg-1)]">
              <span className="flex items-center gap-1.5">
                <Star size={14} className="text-[var(--accent-sun)]" />
                {reviews.length > 0 ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2) : "4.90"} · {reviews.length} отзывов
              </span>
              <span>Москва · UTC+3</span>
              <span className="flex items-center gap-1.5">
                <span className="dot-live h-[6px] w-[6px]" />
                онлайн сейчас
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:min-w-[250px]">
            <FilkaButton
              variant="ghost"
              onClick={() => notify.info({ title: "Профиль сохранён", message: "Он появится в быстрых действиях после подключения избранного." })}
            >
              Сохранить
            </FilkaButton>
            <FilkaButton loading={isCreatingChat} endContent={<MessageSquare size={14} />} onClick={() => void handleStartChat()}>
              Написать · сделка
            </FilkaButton>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">О СЕБЕ</div>
            <p className="text-[14.5px] leading-[1.65] text-[var(--fg-1)]">
              {profile.bio?.trim() || "Фрилансер ещё не добавил подробное описание. Можно оценить портфолио, навыки и отзывы ниже."}
            </p>
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-4">НАВЫКИ · ПОДТВЕРЖДЕНО AI</div>
            {topSkills.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {topSkills.map((skill, index) => (
                  <div key={skill}>
                    <div className="mb-2 flex items-center text-[13px]">
                      <span className="font-semibold text-[var(--fg-0)]">{skill}</span>
                      <span className="t-mono ml-auto text-[var(--mint-300)]">{skillWeight(index)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-3)]">
                      <div className="h-full rounded-full bg-[var(--grad-brand)]" style={{ width: `${skillWeight(index)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--fg-3)]">Навыки пока не указаны.</div>
            )}
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="t-eyebrow">ПОРТФОЛИО · {portfolio.length}</div>
              <div className="ml-auto flex gap-2">
                <FilkaChip tone="muted">Все</FilkaChip>
                <FilkaChip tone="muted">SaaS</FilkaChip>
                <FilkaChip tone="muted">Product</FilkaChip>
              </div>
            </div>
            {portfolio.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {portfolio.map((item, index) => (
                  <a
                    key={item.id}
                    href={item.link || "#"}
                    target={item.link ? "_blank" : undefined}
                    rel={item.link ? "noreferrer" : undefined}
                    className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--bg-1)] transition-transform hover:-translate-y-0.5"
                  >
                    <div
                      className="relative h-[128px]"
                      style={{
                        background: item.image_url ? undefined : gradients[index % gradients.length],
                      }}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="absolute inset-0 opacity-15"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
                            backgroundSize: "16px 16px",
                          }}
                        />
                      )}
                      <div className="t-mono absolute right-3 top-3 text-[10px] font-bold text-[rgba(6,34,25,0.7)]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="space-y-1 px-3 py-3">
                      <div className="truncate text-[13px] font-semibold text-[var(--fg-0)]">{item.title}</div>
                      <div className="line-clamp-2 text-[11px] text-[var(--fg-3)]">
                        {item.description || "Проект без описания"}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--fg-3)]">Портфолио пока пустое.</div>
            )}
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="t-eyebrow">ЛЕНТА</div>
              <Rss size={14} className="text-[var(--mint-300)]" />
            </div>
            <ProfileFeedTab userId={profile.id} />
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="t-eyebrow">УСЛУГИ</div>
              <BriefcaseBusiness size={14} className="text-[var(--mint-300)]" />
            </div>
            <ProfileServicesTab userId={profile.id} />
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-4">ОТЗЫВЫ · {reviews.length}</div>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-1)] p-4">
                    <div className="mb-3 flex gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#FFB38A,#F5E27A)] text-[12px] font-bold text-[#05060f]">
                        {getInitials(review.reviewer_name)}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--fg-0)]">{review.reviewer_name}</div>
                        <div className="t-caption text-[11px]">{new Date(review.created_at).toLocaleDateString("ru-RU")}</div>
                      </div>
                      <div className="ml-auto flex gap-0.5 text-[var(--accent-sun)]">
                        {Array.from({ length: review.rating || 5 }).map((_, index) => <Star key={index} size={12} fill="currentColor" />)}
                      </div>
                    </div>
                    <div className="text-[13.5px] leading-[1.55] text-[var(--fg-1)]">{review.comment || "Без текста"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--fg-3)]">Отзывов пока нет.</div>
            )}
          </FilkaCard>
        </div>

        <aside className="space-y-5">
          <div
            className="relative overflow-hidden rounded-[18px] border p-5"
            style={{
              background: "linear-gradient(180deg, rgba(102,58,243,0.15), rgba(79,43,199,0.03))",
              borderColor: "rgba(102,58,243,0.28)",
            }}
          >
            <div className="absolute right-[-28px] top-[-28px] scale-[1.35] opacity-80">
              <Logo size="lg" />
            </div>
            <div className="t-eyebrow mb-2">AI · МЭТЧ С ВАШИМ ЗАКАЗОМ</div>
            <div className="text-[40px] font-bold tracking-[-0.04em] text-[var(--mint-200)]">97%</div>
            <p className="mt-2 max-w-[220px] text-[13px] leading-[1.5] text-[var(--fg-1)]">
              Совпадает по стеку, бюджету и доступности. Похожие задачи уже закрывал.
            </p>
          </div>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-4">СТАТИСТИКА</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Завершено", "67", "var(--mint-300)"],
                ["В срок", "94%", "var(--mint-300)"],
                ["Повторных", "41%", "var(--info)"],
                ["Ответ", "< 1 ч", "var(--accent-sun)"],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <div className="text-[24px] font-bold tracking-[-0.02em]" style={{ color }}>{value}</div>
                  <div className="t-caption text-[11px]">{label}</div>
                </div>
              ))}
            </div>
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-2">СТАВКА</div>
            <div className="text-[24px] font-bold tracking-[-0.02em] text-[var(--fg-0)]">{formatCurrency(profile.hourly_rate)}</div>
            <div className="mt-1 text-[12px] text-[var(--fg-3)]">или от 60 000 ₽ за проект</div>
            <div className="my-4 h-px bg-[var(--line)]" />
            <div className="flex items-center gap-2 text-[13px] text-[var(--fg-1)]">
              <Wallet size={14} className="text-[var(--mint-300)]" />
              Ближайший слот: <span className="font-semibold text-[var(--fg-0)]">23 апреля</span>
            </div>
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">ФОКУС ПО ПРОЕКТАМ</div>
            <div className="flex flex-wrap gap-2">
              {(profile.skills ?? []).slice(0, 8).map((skill) => (
                <FilkaChip key={skill} tone="muted">
                  <Sparkles size={10} />
                  {skill}
                </FilkaChip>
              ))}
            </div>
            {(profile.skills ?? []).length === 0 ? (
              <div className="text-[12px] text-[var(--fg-3)]">Навыки ещё не добавлены.</div>
            ) : null}
          </FilkaCard>

          <FilkaCard className="p-5">
            <div className="t-eyebrow mb-3">БЫСТРЫЕ ДЕЙСТВИЯ</div>
            <div className="grid gap-2">
              <FilkaButton className="justify-start" onClick={() => void handleStartChat()} loading={isCreatingChat} startContent={<MessageSquare size={14} />}>
                Открыть диалог
              </FilkaButton>
              <FilkaButton
                variant="ghost"
                className="justify-start"
                startContent={<FolderOpen size={14} />}
                onClick={() => notify.info({ title: "Профиль сохранён", message: "Избранное будет доступно после подключения коллекций." })}
              >
                Сохранить профиль
              </FilkaButton>
            </div>
          </FilkaCard>
        </aside>
      </div>
    </div>
  );
};
