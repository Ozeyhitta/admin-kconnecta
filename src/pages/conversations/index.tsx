import { ResourceProps } from "ra-core";
import { MessagesSquare } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ConversationShow } from "./ConversationShow";

export const conversations: ResourceProps = {
  name: "conversations",
  list: ConversationList,
  show: ConversationShow,
  icon: MessagesSquare,
  options: { label: "Quản lý cuộc hội thoại" },
};
