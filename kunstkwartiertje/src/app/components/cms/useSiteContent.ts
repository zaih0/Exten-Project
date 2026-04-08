"use client";

import { useSiteContentContext } from "src/app/components/cms/SiteContentProvider";

export default function useSiteContent() {
    return useSiteContentContext();
}
