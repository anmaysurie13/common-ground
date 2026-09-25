"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteListingAction } from "@/app/actions";
import { Button } from "@/components/ui";

export function DeleteListing({ code, listingId }: { code: string; listingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      className="h-9 px-4"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this listing for everyone? Notes on it will be removed too.")) return;
        start(async () => {
          const r = await deleteListingAction(code, listingId);
          if (r.ok) router.push(`/g/${code}/listings`);
        });
      }}
    >
      Remove listing
    </Button>
  );
}
