"use client";

import { motion } from "framer-motion";

type EditorialContentBlockProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function EditorialContentBlock({
  eyebrow,
  title,
  body,
}: EditorialContentBlockProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="surface-panel editorial-gradient p-6 md:p-8"
    >
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">{title}</h3>
      <p className="mt-5 body-md">{body}</p>
    </motion.article>
  );
}
