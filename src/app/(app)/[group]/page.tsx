type PageParams = {
  params: {
    group: string;
  };
};

export default function GroupOverviewPage({ params }: PageParams) {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Group overview</h1>
      <p>Group: {params.group}</p>
      <p>This route is stubbed until the group overview UI is integrated.</p>
    </main>
  );
}
