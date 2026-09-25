import type { Metadata } from "next";
import { Card, Container, PageTitle } from "@/components/ui";
import { CreateGroupForm } from "./create-group-form";

export const metadata: Metadata = { title: "Create a group" };

export default function NewGroupPage() {
  return (
    <Container className="max-w-xl py-12 sm:py-16">
      <PageTitle eyebrow="Step 1" title="Create your group">
        You&apos;ll get a link to share. Each person fills in their own preferences — nobody sees listings until
        everyone&apos;s done.
      </PageTitle>
      <Card className="p-6 sm:p-8">
        <CreateGroupForm />
      </Card>
    </Container>
  );
}
