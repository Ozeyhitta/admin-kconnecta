import { ResourceProps } from "ra-core";
import { PostList } from "./PostList";
import { PostShow } from "./PostShow";
import { FileText } from "lucide-react";

export const posts: ResourceProps = {
  name: "posts",
  list: PostList,
  show: PostShow,
  icon: FileText,
  options: { label: "Quản lý bài đăng" },
};
