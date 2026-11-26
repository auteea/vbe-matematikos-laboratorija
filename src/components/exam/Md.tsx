import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function Md({ children, inline }: { children: string; inline?: boolean }) {
  return (
    <div className={inline ? "exam-md inline [&>p]:inline [&>p]:m-0" : "exam-md"}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
