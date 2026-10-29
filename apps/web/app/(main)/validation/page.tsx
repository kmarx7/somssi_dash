import { SurveyAnalysis } from "@/components/operations/analytics";
import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "성과·파일럿" };
export default function Page() {
  return (
    <>
      <SurveyAnalysis />
      <OperationalPage
        title="성과·파일럿"
        description="조사 대상과 문항을 정하고 익명 응답을 입력합니다. 구매 의향과 실제 결제를 구분합니다."
        kinds={["surveyForms", "surveys"]}
      />
    </>
  );
}
