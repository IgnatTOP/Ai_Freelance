import { PublicProfilePage } from "@/views/dashboard/PublicProfilePage";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function ProfileByIdPage({ params }: Props) {
    const { id } = await params;
    return <PublicProfilePage userId={id} />;
}
