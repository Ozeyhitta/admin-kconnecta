import { ResourceProps } from "ra-core";
import { CommentList } from "./CommentList";
import { MessageSquare } from "lucide-react";

export const comments: ResourceProps = {
  name: "comments",
  list: CommentList,
  icon: MessageSquare,
  options: { label: "Quản lý bình luận" },
};
