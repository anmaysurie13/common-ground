import { Container, LinkButton, PageTitle } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-16">
      <PageTitle title="We couldn't find that">
        The link may be mistyped, or the group may no longer exist.
      </PageTitle>
      <LinkButton href="/">Back home</LinkButton>
    </Container>
  );
}
