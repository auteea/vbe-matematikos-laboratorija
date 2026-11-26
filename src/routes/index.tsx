import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "VBE uždavinių generatorius" },
    { name: "description", content: "Generuokite VBE matematikos uždavinius ir bandomuosius egzaminus." },
    { property: "og:title", content: "VBE uždavinių generatorius" },
    { property: "og:description", content: "Generuokite VBE matematikos uždavinius ir bandomuosius egzaminus." },
  ] }),
  beforeLoad: () => { throw redirect({ to: "/generuoti" }); },
});
