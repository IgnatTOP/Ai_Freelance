import { OrderDetailPage } from "@/views/dashboard/OrderDetailPage";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function OrderDetailRoute({ params }: Props) {
    const { id } = await params;
    return <OrderDetailPage orderId={id} />;
}
