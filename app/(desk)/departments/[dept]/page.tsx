import DepartmentDetailView from "./DepartmentDetailView";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;
  return <DepartmentDetailView slug={dept} />;
}
