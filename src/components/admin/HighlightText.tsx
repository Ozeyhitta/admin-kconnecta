import * as React from "react";

interface HighlightTextProps {
  text?: string;
  search?: string;
}

const removeAccents = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

export const HighlightText: React.FC<HighlightTextProps> = ({ text, search }) => {
  if (!text) return null;
  if (!search || !search.trim()) {
    return <>{text}</>;
  }

  const query = search.trim();
  const normalizedText = removeAccents(text).toLowerCase();
  const normalizedQuery = removeAccents(query).toLowerCase();

  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = normalizedText.indexOf(normalizedQuery);

  while (index !== -1) {
    // Add non-matching text segment before the match
    if (index > lastIndex) {
      result.push(text.substring(lastIndex, index));
    }
    
    // Add matching segment with highlight, keeping original text case/accents
    const matchEnd = index + normalizedQuery.length;
    result.push(
      <mark
        key={index}
        className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-semibold dark:bg-yellow-900/50 dark:text-yellow-100"
      >
        {text.substring(index, matchEnd)}
      </mark>
    );
    
    lastIndex = matchEnd;
    index = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining trailing text segment
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return <>{result}</>;
};
