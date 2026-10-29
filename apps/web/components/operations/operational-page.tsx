import { PageHeader, ExternalLink } from "@/components/ui";
import { ConnectionNotice, RecordManager } from "./record-manager";
export function OperationalPage({
  title,
  description,
  kinds,
  external,
}: {
  title: string;
  description: string;
  kinds: string[];
  external?: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="SOMSSI · OPERATIONS"
        title={title}
        description={description}
      />
      <ConnectionNotice />
      {external ? (
        <div className="operation-legacy">
          <ExternalLink href={external}>기존 원본 앱 열기</ExternalLink>
          <p className="panel-note">
            기존 앱 데이터는 자동 수입하지 않습니다. 먼저 기존 사이트에서
            JSON/CSV를 백업해 주세요.
          </p>
        </div>
      ) : null}
      {kinds.map((kind) => (
        <RecordManager kind={kind} key={kind} />
      ))}
    </>
  );
}
