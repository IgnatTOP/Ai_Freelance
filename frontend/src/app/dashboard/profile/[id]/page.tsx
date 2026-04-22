import { PublicProfilePage } from "@/views/dashboard/PublicProfilePage";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function ProfileByIdPage({ params }: Props) {
    const { id } = await params;
    return <PublicProfilePage userId={id} />;
}
