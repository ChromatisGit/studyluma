type PageParams = {
  params: {
    group: string;
    principles: string
  };
};

export default function GroupPrinciplesPage({ params }: PageParams) {

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Group principles</h1>
      <p>Group: {params.group}</p>
      <p>This route is stubbed until the group principles UI is integrated.</p>
    </main>
  );
}
