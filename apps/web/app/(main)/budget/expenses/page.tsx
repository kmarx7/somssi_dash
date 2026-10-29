import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "집행·정산 관리" };
export default function Page() {
  return (
    <OperationalPage
      title="집행·정산 관리"
      description="자금별 계획예산·실제 지출·정정·정산·견적을 분리합니다."
      kinds={["allocations", "expenses", "expenseReviews", "estimates"]}
    />
  );
}
