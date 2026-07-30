type CurrentProjectHeaderProps = {
  projectName: string;
};

export default function CurrentProjectHeader({
  projectName,
}: CurrentProjectHeaderProps) {
  return (
    <div className="current-project-header" role="status" aria-label={`当前项目：${projectName}`}>
      <span className="current-project-status" aria-hidden="true" />
      <span className="current-project-label">当前项目：</span>
      <span className="current-project-name">{projectName}</span>
    </div>
  );
}
