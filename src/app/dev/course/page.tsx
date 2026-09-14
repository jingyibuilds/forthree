import { notFound, redirect } from "next/navigation";
import { COURSE_PATH } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default function DevCoursePreview() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  redirect(`${COURSE_PATH}?preview=1`);
}
